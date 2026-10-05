import 'dotenv/config'; // loads apps/api/.env (or wherever your DB/LEDGER_ACCT_* vars live) — adjust path if needed, e.g. require('dotenv').config({ path: 'apps/api/.env' })
import { DataSource } from 'typeorm';
import { LedgerService } from '../service/ledger.service';
import { SettlementService } from '../service/settlement.service';
import { Payment, PaymentKind, PaymentStatus } from '../../billing/entities/payment-entity';
import { UserSubscription, SubscriptionStatus } from '../../billing/entities/user-subscription-entity'; // adjust if your export names differ
import { WatchStat } from '../entities/watch-stat-entity';
import path from 'path';


const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const FAKE_USER_1 = 'aa8796d5-ad0b-49f5-9875-af30d71dd0b3';
const FAKE_USER_2 = '7690833b-de0b-44b4-9af7-bb6435e2b9b3';
const FAKE_PLAN_ID = '37d7b381-0413-4c8f-a2e2-07e2f80ac69f'; // fake — if planId has its own FK to a real plans table, swap this for a real one (SELECT id FROM plans LIMIT 1)
const MONTH_START = new Date('2099-01-01T00:00:00Z');

async function main() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: "postgresql://admin:admin@localhost:6432/task-db",
        entities: [path.join(__dirname, '../../../**/*-entity.{ts,js}')],
        synchronize: false,
    });
    await dataSource.initialize();
    console.log('✔ connected to Postgres');

    // These two services take a DataSource in their constructor — no other Nest providers needed.
    const ledgerService = new LedgerService(dataSource);
    const settlementService = new SettlementService(dataSource, ledgerService);

    await dataSource.transaction(async (manager) => {
        await ledgerService.ensureOrgAccounts(ORG_A, manager);
        await ledgerService.ensureOrgAccounts(ORG_B, manager);
        console.log('✔ org ledger accounts ensured');

        // NEW: fake subscriptions, required because Payment has a CHECK constraint
        // ("chk_payments_exactly_one_subscription") demanding exactly one of
        // userSubscriptionId / organizationSubscriptionId be set — and an FK meaning
        // it must point at a row that actually exists, not just any UUID.
        const subRepo = manager.getRepository(UserSubscription);
        const sub1 = await subRepo.save(
            subRepo.create({
                userId: FAKE_USER_1,
                planId: FAKE_PLAN_ID,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: new Date('2099-02-01T00:00:00Z'),
            }),
        );
        const sub2 = await subRepo.save(
            subRepo.create({
                userId: FAKE_USER_2,
                planId: FAKE_PLAN_ID,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: new Date('2099-02-01T00:00:00Z'),
            }),
        );
        console.log('✔ fake user subscriptions created');

        const paymentRepo = manager.getRepository(Payment);
        await paymentRepo.save(
            paymentRepo.create({
                kind: PaymentKind.USER_SUBSCRIPTION,
                userId: FAKE_USER_1,
                userSubscriptionId: sub1.id, // NEW: satisfies the check constraint + FK
                stripePaymentIntentId: `pi_test_${Date.now()}_1`,
                amountCents: 1000,
                currency: 'USD',
                status: PaymentStatus.SUCCEEDED,
                platformShareCents: 200,
                creatorPoolShareCents: 800,
                paidAt: new Date('2099-01-15T00:00:00Z'),
            }),
        );
        await paymentRepo.save(
            paymentRepo.create({
                kind: PaymentKind.USER_SUBSCRIPTION,
                userId: FAKE_USER_2,
                userSubscriptionId: sub2.id, // NEW
                stripePaymentIntentId: `pi_test_${Date.now()}_2`,
                amountCents: 1000,
                currency: 'USD',
                status: PaymentStatus.SUCCEEDED,
                platformShareCents: 200,
                creatorPoolShareCents: 800,
                paidAt: new Date('2099-01-20T00:00:00Z'),
            }),
        );
        console.log('✔ 2 fake payments inserted');

        const watchRepo = manager.getRepository(WatchStat);
        await watchRepo.save(
            watchRepo.create({
                userId: FAKE_USER_1,
                contentId: '55555555-5555-5555-5555-555555555555',
                organizationId: ORG_A,
                day: '2099-01-10',
                seconds: 3000,
                countsForEarnings: true,
            }),
        );
        await watchRepo.save(
            watchRepo.create({
                userId: FAKE_USER_2,
                contentId: '66666666-6666-6666-6666-666666666666',
                organizationId: ORG_B,
                day: '2099-01-12',
                seconds: 1000,
                countsForEarnings: true,
            }),
        );
        console.log('✔ watch stats inserted (75%/25% split)');
    });

    console.log('\nRunning settleMonth...\n');
    const run = await settlementService.settleMonth(MONTH_START);
    console.log('SettlementRun:', {
        status: run.status,
        grossCollectedCents: run.grossCollectedCents,
        platformShareCents: run.platformShareCents,
        creatorPoolCents: run.creatorPoolCents,
    });

    const orgAAccount = await ledgerService.getOrgEarningsAccountId(ORG_A);
    const orgBAccount = await ledgerService.getOrgEarningsAccountId(ORG_B);
    console.log('org A earnings:', await ledgerService.getBalance(orgAAccount), '(expect 1200)');
    console.log('org B earnings:', await ledgerService.getBalance(orgBAccount), '(expect 400)');

    await ledgerService.assertBalancedToZero();
    console.log('\n✔ ledger balanced');

    await dataSource.destroy();
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});