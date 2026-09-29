import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790656266096 implements MigrationInterface {
    name = 'Migration1790656266096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_0c6e691023c3663da25bb7efce2"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`);
        await queryRunner.query(`CREATE TABLE "watch_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "contentId" uuid NOT NULL, "organizationId" uuid NOT NULL, "day" date NOT NULL, "seconds" integer NOT NULL DEFAULT '0', "countsForEarnings" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d0f9de443c8bba6b0f27e46b810" UNIQUE ("userId", "contentId", "day"), CONSTRAINT "PK_ddaf148e3b360468949949829ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_71f758105ca9e0ba0f7924d851" ON "watch_stats" ("day", "organizationId") `);
        await queryRunner.query(`CREATE TYPE "public"."settlement_runs_status_enum" AS ENUM('draft', 'calculated', 'posted', 'failed')`);
        await queryRunner.query(`CREATE TABLE "settlement_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "periodStart" date NOT NULL, "periodEnd" date NOT NULL, "status" "public"."settlement_runs_status_enum" NOT NULL DEFAULT 'draft', "grossCollectedCents" bigint NOT NULL DEFAULT '0', "platformShareCents" bigint NOT NULL DEFAULT '0', "creatorPoolCents" bigint NOT NULL DEFAULT '0', "totalWatchSeconds" bigint NOT NULL DEFAULT '0', "ledgerTransferIds" jsonb, "postedAt" TIMESTAMP WITH TIME ZONE, "error" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_efa21bf8e11b9589e9c3289b237" UNIQUE ("periodStart"), CONSTRAINT "PK_8f6ed8b9e1f399dd30ce2e39745" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settlement_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "settlementRunId" uuid NOT NULL, "organizationId" uuid NOT NULL, "watchSeconds" bigint NOT NULL, "shareRatio" numeric(12,10) NOT NULL, "amountCents" bigint NOT NULL, "ledgerTransferId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_54aae0c171e15567d33a2fcf5ef" UNIQUE ("settlementRunId", "organizationId"), CONSTRAINT "PK_82a2947e08fa4fbc13b92c8ed31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('requested', 'approved', 'paid', 'rejected', 'failed')`);
        await queryRunner.query(`CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "requestedByUserId" uuid NOT NULL, "amountCents" bigint NOT NULL, "currency" character(3) NOT NULL DEFAULT 'USD', "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'requested', "approvedByUserId" uuid, "approvedAt" TIMESTAMP WITH TIME ZONE, "paidAt" TIMESTAMP WITH TIME ZONE, "rejectionReason" character varying, "externalReference" character varying, "ledgerTransferIds" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0c63e54e6cdc11210dbffb1fb3" ON "payouts" ("organizationId", "status") `);
        await queryRunner.query(`CREATE TABLE "org_ledger_accounts" ("organizationId" uuid NOT NULL, "earningsAccountId" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_164176daa0fae33fd52accf269d" UNIQUE ("earningsAccountId"), CONSTRAINT "PK_952e3cf1c317bb225b3589d557d" PRIMARY KEY ("organizationId"))`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "createdAt"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_kind_enum" AS ENUM('user_subscription', 'org_subscription')`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "kind" "public"."payments_kind_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "organizationId" uuid`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "subscriptionId" uuid`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "stripePaymentIntentId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_57059f281caef51ef1c15adaf35" UNIQUE ("stripePaymentIntentId")`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "amountCents" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "platformShareCents" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "creatorPoolShareCents" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "refundedCents" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "periodStart" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "periodEnd" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "settlementRunId" uuid`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "ledgerTransferIds" jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "ledgerRecordedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "failureReason" character varying`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "error" character varying`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "currency" character(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum" RENAME TO "payments_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('succeeded', 'failed', 'pending', 'partially_refunded', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum" USING "status"::"text"::"public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripeInvoiceId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ALTER COLUMN "absoluteExpiry" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_e32ed97ea591c025c98b53e129" ON "payments" ("status", "paidAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_f6c7c8a79e608f03efaba81e5b" ON "payments" ("settlementRunId") `);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_0c6e691023c3663da25bb7efce2" FOREIGN KEY ("organizationSubscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlement_lines" ADD CONSTRAINT "FK_e1e79914408a1277d6cfd81ee35" FOREIGN KEY ("settlementRunId") REFERENCES "settlement_runs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlement_lines" DROP CONSTRAINT "FK_e1e79914408a1277d6cfd81ee35"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_0c6e691023c3663da25bb7efce2"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6c7c8a79e608f03efaba81e5b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e32ed97ea591c025c98b53e129"`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ALTER COLUMN "absoluteExpiry" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "stripeInvoiceId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum_old" AS ENUM('succeeded', 'failed', 'pending', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum_old" USING "status"::"text"::"public"."payments_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum_old" RENAME TO "payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "currency" character varying(3) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "receivedAt"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "error"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "failureReason"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "ledgerRecordedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "ledgerTransferIds"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "settlementRunId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "periodEnd"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "periodStart"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "refundedCents"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "creatorPoolShareCents"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "platformShareCents"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "amountCents"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_57059f281caef51ef1c15adaf35"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "stripePaymentIntentId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "subscriptionId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "organizationId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "kind"`);
        await queryRunner.query(`DROP TYPE "public"."payments_kind_enum"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "amount" integer NOT NULL`);
        await queryRunner.query(`DROP TABLE "org_ledger_accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c63e54e6cdc11210dbffb1fb3"`);
        await queryRunner.query(`DROP TABLE "payouts"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
        await queryRunner.query(`DROP TABLE "settlement_lines"`);
        await queryRunner.query(`DROP TABLE "settlement_runs"`);
        await queryRunner.query(`DROP TYPE "public"."settlement_runs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71f758105ca9e0ba0f7924d851"`);
        await queryRunner.query(`DROP TABLE "watch_stats"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_0c6e691023c3663da25bb7efce2" FOREIGN KEY ("organizationSubscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
