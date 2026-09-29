
import { resolve } from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), "apps/api/.env") });

import { Injectable } from '@nestjs/common'; // drop this import if you're not on Nest
import { DataSource, EntityManager } from 'typeorm';
export interface LedgerAccount {
    id: string;
    name: string;
    currency: string;
    balance: string; // pgledger returns numeric as string; caller should Number() or keep as string for display
}

// Platform account IDs — populate from config/env once you've run the bootstrap script.
// Lazy (a getter-backed object, not eagerly-read constants) so it doesn't matter whether
// this module gets imported before or after your app's dotenv/.env loading runs.
function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(
            `Missing required env var ${key}. Run bootstrap_platform_accounts.sql and copy the ` +
            `resulting account ids into your .env before starting the app.`,
        );
    }
    return value;
}

export const PLATFORM_ACCOUNTS = {
    get stripeClearing() { return requireEnv('LEDGER_ACCT_STRIPE_CLEARING'); },
    get revenue() { return requireEnv('LEDGER_ACCT_REVENUE'); },
    get creatorPool() { return requireEnv('LEDGER_ACCT_CREATOR_POOL'); },
    get payoutsPaid() { return requireEnv('LEDGER_ACCT_PAYOUTS_PAID'); },
};

@Injectable()
export class LedgerService {
    constructor(private readonly dataSource: DataSource) { }

    private runner(manager?: EntityManager) {
        return manager ?? this.dataSource.manager;
    }

    // ---------- account management ----------

    /**
     * Creates the two ledger accounts an org needs the moment it becomes able to earn
     * (i.e. when it's approved to publish / goes Enterprise). Idempotent: if accounts
     * already exist for this org, does nothing and returns them.
     */
    async ensureOrgAccounts(
        organizationId: string,
        manager?: EntityManager,
    ): Promise<{ earningsAccountId: string; payoutsPendingAccountId: string }> {
        const m = this.runner(manager);

        const existing = await m.query(
            `SELECT "earningsAccountId" FROM org_ledger_accounts WHERE "organizationId" = $1`,
            [organizationId],
        );
        if (existing.length > 0) {
            // NOTE: extend org_ledger_accounts with payoutsPendingAccountId if you split it out;
            // shown here as a second lookup for clarity. Consider adding that column instead.
            const payouts = await m.query(
                `SELECT id FROM pgledger_accounts WHERE name = $1`,
                [`org:${organizationId}:payouts_pending`],
            );
            return {
                earningsAccountId: existing[0].earningsAccountId,
                payoutsPendingAccountId: payouts[0]?.id,
            };
        }

        const [earnings] = await m.query(
            `SELECT * FROM pgledger_create_account($1::text, $2::text, $3::boolean, $4::boolean)`,
            [`org:${organizationId}:earnings`, 'USD', false, true],
        );
        const [payoutsPending] = await m.query(
            `SELECT * FROM pgledger_create_account($1::text, $2::text, $3::boolean, $4::boolean)`,
            [`org:${organizationId}:payouts_pending`, 'USD', false, true],
        );

        await m.query(
            `INSERT INTO org_ledger_accounts ("organizationId", "earningsAccountId") VALUES ($1, $2)`,
            [organizationId, earnings.id],
        );

        return { earningsAccountId: earnings.id, payoutsPendingAccountId: payoutsPending.id };
    }

    async getOrgEarningsAccountId(organizationId: string, manager?: EntityManager): Promise<string> {
        const m = this.runner(manager);
        const rows = await m.query(
            `SELECT "earningsAccountId" FROM org_ledger_accounts WHERE "organizationId" = $1`,
            [organizationId],
        );
        if (!rows.length) throw new Error(`No ledger account for org ${organizationId}. Call ensureOrgAccounts first.`);
        return rows[0].earningsAccountId;
    }

    /**
     * pgledger_accounts_view returns ONE ROW PER VERSION (full history), not just the current
     * state — confirmed from hands-on testing. Always take the latest version.
     */
    async getBalance(accountId: string, manager?: EntityManager): Promise<number> {
        const m = this.runner(manager);
        const rows = await m.query(
            `SELECT balance FROM pgledger_accounts_view WHERE id = $1 ORDER BY version DESC LIMIT 1`,
            [accountId],
        );
        return Number(rows[0]?.balance ?? 0);
    }

    // ---------- transfers ----------

    /** Raw transfer. Prefer the named methods below in application code; this is the primitive they use. */
    private async transfer(
        fromAccountId: string,
        toAccountId: string,
        amountCents: number,
        manager?: EntityManager,
    ): Promise<string> {
        if (amountCents <= 0) throw new Error(`Refusing zero/negative transfer: ${amountCents}`);
        const m = this.runner(manager);
        const [row] = await m.query(
            `SELECT * FROM pgledger_create_transfer($1::text, $2::text, $3::numeric)`,
            [fromAccountId, toAccountId, amountCents],
        );
        return row.id; // pgledger transfer id — store this on Payment/SettlementLine/Payout
    }

    /**
     * Posts ONE settlement run: platform's cut for the month, plus each org's line.
     * MUST run inside a single DB transaction alongside marking the run POSTED —
     * call this from within a manager.transaction(...) block in your settlement job.
     */
    async postSettlementRun(
        manager: EntityManager, // required, not optional — this must never run outside a transaction
        input: {
            platformShareCents: number;
            creatorPoolCents: number; // NEW: total pool for the month, must be funded before allocating out
            lines: { organizationId: string; amountCents: number }[];
        },
    ): Promise<{ platformTransferId: string; poolFundingTransferId: string | null; lineTransferIds: Record<string, string> }> {
        const platformTransferId = await this.transfer(
            PLATFORM_ACCOUNTS.stripeClearing,
            PLATFORM_ACCOUNTS.revenue,
            input.platformShareCents,
            manager,
        );

        // BUG FIX: the pool must actually receive the money before any org can be paid from it.
        // Without this, every payout from creator_pool is an overdraft, since the account
        // never received anything — this is exactly the error we hit in testing.
        let poolFundingTransferId: string | null = null;
        if (input.creatorPoolCents > 0) {
            poolFundingTransferId = await this.transfer(
                PLATFORM_ACCOUNTS.stripeClearing,
                PLATFORM_ACCOUNTS.creatorPool,
                input.creatorPoolCents,
                manager,
            );
        }

        const lineTransferIds: Record<string, string> = {};
        for (const line of input.lines) {
            const earningsAccountId = await this.getOrgEarningsAccountId(line.organizationId, manager);
            lineTransferIds[line.organizationId] = await this.transfer(
                PLATFORM_ACCOUNTS.creatorPool,
                earningsAccountId,
                line.amountCents,
                manager,
            );
        }

        return { platformTransferId, poolFundingTransferId, lineTransferIds };
    }

    /** Step 1 of a payout: reserve funds. Fails at the DB level if balance is insufficient. */
    async reserveForPayout(
        manager: EntityManager,
        organizationId: string,
        amountCents: number,
    ): Promise<string> {
        const earningsAccountId = await this.getOrgEarningsAccountId(organizationId, manager);
        const payoutsPendingAccountId = (
            await manager.query(`SELECT id FROM pgledger_accounts WHERE name = $1`, [
                `org:${organizationId}:payouts_pending`,
            ])
        )[0]?.id;
        if (!payoutsPendingAccountId) throw new Error(`No payouts_pending account for org ${organizationId}`);

        // This is where pgledger's "no negative balance" constraint does the real work:
        // if amountCents > current earnings balance, this throws and nothing is written.
        return this.transfer(earningsAccountId, payoutsPendingAccountId, amountCents, manager);
    }

    /** Step 2a: admin approves — money leaves the org's pending bucket for good. */
    async finalizePayout(manager: EntityManager, organizationId: string, amountCents: number): Promise<string> {
        const payoutsPendingAccountId = (
            await manager.query(`SELECT id FROM pgledger_accounts WHERE name = $1`, [
                `org:${organizationId}:payouts_pending`,
            ])
        )[0]?.id;
        return this.transfer(payoutsPendingAccountId, PLATFORM_ACCOUNTS.payoutsPaid, amountCents, manager);
    }

    /** Step 2b: admin rejects — money returns to the org's withdrawable earnings. */
    async releasePayoutReservation(
        manager: EntityManager,
        organizationId: string,
        amountCents: number,
    ): Promise<string> {
        const earningsAccountId = await this.getOrgEarningsAccountId(organizationId, manager);
        const payoutsPendingAccountId = (
            await manager.query(`SELECT id FROM pgledger_accounts WHERE name = $1`, [
                `org:${organizationId}:payouts_pending`,
            ])
        )[0]?.id;
        return this.transfer(payoutsPendingAccountId, earningsAccountId, amountCents, manager);
    }

    /** Late refund after settlement: platform absorbs it (default from Flow E). */
    async recordLateRefund(manager: EntityManager, amountCents: number): Promise<string> {
        return this.transfer(PLATFORM_ACCOUNTS.revenue, PLATFORM_ACCOUNTS.stripeClearing, amountCents, manager);
    }

    // ---------- reconciliation ----------

    /**
     * Sanity check: every account's CURRENT balance should sum to exactly zero.
     * Must take only the latest version per account id, since the view holds full history.
     * Run this after any batch of writes (e.g. end of a settlement run, nightly cron).
     */
    async assertBalancedToZero(manager?: EntityManager): Promise<void> {
        const m = this.runner(manager);
        const [{ total }] = await m.query(`
      SELECT SUM(balance) AS total FROM (
        SELECT DISTINCT ON (id) balance
        FROM pgledger_accounts_view
        ORDER BY id, version DESC
      ) latest
    `);
        if (Number(total) !== 0) {
            throw new Error(`LEDGER OUT OF BALANCE: sum of all accounts = ${total}, expected 0`);
        }
    }
}
