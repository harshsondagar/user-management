import 'dotenv/config';
import { DataSource } from 'typeorm';
import { LedgerService } from '../service/ledger.service';
import { SettlementService } from '../service/settlement.service';
import { PayoutService } from '../service/organization-payout.service';
import { Payment, PaymentKind, PaymentStatus } from '../../billing/entities/payment-entity';
import { UserSubscription, SubscriptionStatus } from '../../billing/entities/user-subscription-entity';
import { WatchStat } from '../entities/watch-stat-entity';
import { Payout, PayoutStatus } from "../entities/payout-entity"
import path from 'path';

// Use REAL existing user ids from your users table (payments/subscriptions have real FKs).
// Replace these with actual ids you found earlier via: SELECT id FROM users LIMIT 3;
const REAL_USER_1 = 'e23528c7-7286-4fdf-9077-8580383b1527';
const REAL_USER_2 = '76e69aa1-6697-43d5-87b2-b7ec03621b1f';
const REAL_PLAN_ID = '88f23798-5d37-4944-a107-0129724d800c';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const MONTH_START = new Date('2099-02-01T00:00:00Z'); // a fresh month, avoids colliding with earlier test data

async function main() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: 'postgresql://admin:admin@localhost:6432/task-db',
        entities: [path.join(__dirname, '../../../**/*-entity.{ts,js}')],
        synchronize: false,
    });
    await dataSource.initialize();
    console.log('✔ connected to Postgres');

    const ledgerService = new LedgerService(dataSource);
    const settlementService = new SettlementService(dataSource, ledgerService);
    const payoutService = new PayoutService(dataSource, ledgerService);

    // ---------- 1. Seed a settled month, same as before ----------
    await dataSource.transaction(async (manager) => {
        await ledgerService.ensureOrgAccounts(ORG_A, manager);
        await ledgerService.ensureOrgAccounts(ORG_B, manager);

        const subRepo = manager.getRepository(UserSubscription);
        const sub1 = await subRepo.save(subRepo.create({
            userId: REAL_USER_1, planId: REAL_PLAN_ID, status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: new Date('2099-03-01T00:00:00Z'),
        }));
        const sub2 = await subRepo.save(subRepo.create({
            userId: REAL_USER_2, planId: REAL_PLAN_ID, status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: new Date('2099-03-01T00:00:00Z'),
        }));

        const paymentRepo = manager.getRepository(Payment);
        await paymentRepo.save(paymentRepo.create({
            kind: PaymentKind.USER_SUBSCRIPTION, userId: REAL_USER_1, userSubscriptionId: sub1.id,
            stripePaymentIntentId: `pi_e2e_${Date.now()}_1`, amountCents: 1000, currency: 'USD',
            status: PaymentStatus.SUCCEEDED, platformShareCents: 200, creatorPoolShareCents: 800,
            paidAt: new Date('2099-02-15T00:00:00Z'),
        }));
        await paymentRepo.save(paymentRepo.create({
            kind: PaymentKind.USER_SUBSCRIPTION, userId: REAL_USER_2, userSubscriptionId: sub2.id,
            stripePaymentIntentId: `pi_e2e_${Date.now()}_2`, amountCents: 1000, currency: 'USD',
            status: PaymentStatus.SUCCEEDED, platformShareCents: 200, creatorPoolShareCents: 800,
            paidAt: new Date('2099-02-20T00:00:00Z'),
        }));

        const watchRepo = manager.getRepository(WatchStat);
        await watchRepo.save(watchRepo.create({
            userId: REAL_USER_1, contentId: '55555555-5555-5555-5555-555555555555',
            organizationId: ORG_A, day: '2099-02-10', seconds: 3000, countsForEarnings: true,
        }));
        await watchRepo.save(watchRepo.create({
            userId: REAL_USER_2, contentId: '66666666-6666-6666-6666-666666666666',
            organizationId: ORG_B, day: '2099-02-12', seconds: 1000, countsForEarnings: true,
        }));
    });
    console.log('✔ seeded a month of payments + watch stats');

    const run = await settlementService.settleMonth(MONTH_START);
    console.log('✔ settled:', { status: run.status, pool: run.creatorPoolCents });

    const orgAAccount = await ledgerService.getOrgEarningsAccountId(ORG_A);
    const orgABalanceAfterSettlement = await ledgerService.getBalance(orgAAccount);
    console.log(`  org A earnings after settlement: ${orgABalanceAfterSettlement} (expect 1200)`);

    // ---------- 2. Try to withdraw IMMEDIATELY — should be BLOCKED by the hold period ----------
    console.log('\n--- Testing hold period (should reject) ---');
    try {
        await payoutService.requestPayout(ORG_A, REAL_USER_1, 1200);
        console.error('✘ FAIL: payout should have been rejected by the hold period, but succeeded');
    } catch (err: any) {
        console.log(`✔ correctly rejected: ${err.message}`);
    }

    // ---------- 3. Backdate the settlement entry so the money "ages past" the hold period ----------
    // Test-only technique, matching pgledger's own README pattern for testing historical balances.
    await dataSource.query(`
    UPDATE pgledger_entries
    SET created_at = now() - interval '10 days'
    WHERE account_id = $1
  `, [orgAAccount]);
    console.log('✔ backdated org A ledger entries by 10 days (test-only)');

    // ---------- 4. Now the withdrawal should succeed ----------
    console.log('\n--- Testing successful payout request ---');
    const payout = await payoutService.requestPayout(ORG_A, REAL_USER_1, 1200);
    console.log(`✔ payout requested: ${payout.id}, status=${payout.status}`);

    const orgABalanceAfterRequest = await ledgerService.getBalance(orgAAccount);
    console.log(`  org A earnings after request: ${orgABalanceAfterRequest} (expect 0 — reserved out)`);

    // ---------- 5. Admin approves, then pays ----------
    const approved = await payoutService.approvePayout(payout.id, 'fake-admin-user-id');
    console.log(`✔ approved: status=${approved.status}`);

    const paid = await payoutService.markPaid(payout.id, 'test-wire-ref-001');
    console.log(`✔ paid: status=${paid.status}, externalReference=${paid.externalReference}`);

    // ---------- 6. Test the reject path with a second, smaller payout ----------
    console.log('\n--- Testing reject path ---');
    // Org A has 0 left, so let's settle again isn't needed — instead just verify reject on
    // a fresh tiny reservation works by using org B (which has 400, also needs backdating).
    const orgBAccount = await ledgerService.getOrgEarningsAccountId(ORG_B);
    await dataSource.query(`UPDATE pgledger_entries SET created_at = now() - interval '10 days' WHERE account_id = $1`, [orgBAccount]);

    const payoutB = await payoutService.requestPayout(ORG_B, REAL_USER_2, 400);
    console.log(`✔ org B payout requested: ${payoutB.id}`);
    const rejected = await payoutService.reject(payoutB.id, 'test rejection reason');
    console.log(`✔ rejected: status=${rejected.status}, reason=${rejected.rejectionReason}`);

    const orgBBalanceAfterReject = await ledgerService.getBalance(orgBAccount);
    console.log(`  org B earnings after reject: ${orgBBalanceAfterReject} (expect 400 — returned)`);

    // ---------- 7. Test minimum payout amount rejection ----------
    console.log('\n--- Testing minimum payout amount ---');
    try {
        await payoutService.requestPayout(ORG_B, REAL_USER_2, 500); // under MIN_PAYOUT_CENTS (2000)
        console.error('✘ FAIL: should have rejected amount below minimum');
    } catch (err: any) {
        console.log(`✔ correctly rejected: ${err.message}`);
    }

    // ---------- 8. Final integrity check ----------
    await ledgerService.assertBalancedToZero();
    console.log('\n✔ ledger still balanced after full payout flow');

    await dataSource.destroy();
}

main().catch((err) => {
    console.error('E2E test failed:', err);
    process.exit(1);
});