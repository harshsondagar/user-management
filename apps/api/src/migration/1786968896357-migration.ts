import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786968896357 implements MigrationInterface {
    name = 'Migration1786968896357';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "features" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "name" character varying NOT NULL, "description" text, CONSTRAINT "UQ_0cc5c687428b94489ce1edc3c5a" UNIQUE ("key"), CONSTRAINT "PK_5c1e336df2f4a7051e5bf08a941" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."plan_entitlements_period_enum" AS ENUM('daily', 'monthly', 'lifetime')`,
        );
        await queryRunner.query(
            `CREATE TABLE "plan_entitlements" ("planId" uuid NOT NULL, "featureId" uuid NOT NULL, "valueLimit" integer NOT NULL, "period" "public"."plan_entitlements_period_enum" NOT NULL, CONSTRAINT "PK_5194c6fce774836b36e43fe2814" PRIMARY KEY ("planId", "featureId"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "stripePriceId" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_95f7ef3fc4c31a3545b4d825dd4" UNIQUE ("code"), CONSTRAINT "UQ_b671aaeeecb098232ba628bf2e6" UNIQUE ("stripePriceId"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_subscriptions_status_enum" AS ENUM('active', 'past_due', 'canceled', 'incomplete')`,
        );

        await queryRunner.query(
            `CREATE TABLE "user_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "planId" uuid NOT NULL, "status" "public"."user_subscriptions_status_enum" NOT NULL, "stripeSubscriptionId" character varying, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_107c0ca30c0c632c0b711e5add7" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "PK_9e928b0954e51705ab44988812c" PRIMARY KEY ("id"))`,
        );

        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_user_subscriptions_active_per_user"
            ON "user_subscriptions" ("userId")
            WHERE "status" = 'active'
        `);
        await queryRunner.query(
            `CREATE INDEX "IDX_2dfab576863bc3f84d4f696227" ON "user_subscriptions" ("userId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "usage_counters" ("userId" uuid NOT NULL, "featureId" uuid NOT NULL, "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_755a1aeb25249b2a5319366bd9e" PRIMARY KEY ("userId", "featureId", "periodStart"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "stripe_webhook_events" ("stripeEventId" uuid NOT NULL, "type" character varying NOT NULL, "processedAt" TIMESTAMP WITH TIME ZONE, "payload" jsonb NOT NULL, CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018" PRIMARY KEY ("stripeEventId"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."payments_status_enum" AS ENUM('succeeded', 'failed', 'pending', 'refunded')`,
        );
        await queryRunner.query(
            `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userSubscriptionId" uuid NOT NULL, "stripeInvoiceId" character varying NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL, "status" "public"."payments_status_enum" NOT NULL, "paidAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "plan_entitlements" ADD CONSTRAINT "FK_b77a22e02b7e33336ea05ac35a7" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "plan_entitlements" ADD CONSTRAINT "FK_2fa5d0ede7adc3e27adcf88fbc4" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_2dfab576863bc3f84d4f6962274" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_55c9f77733123bd2ead29886017" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `ALTER TABLE "users" ADD "stripeCustomerId" character varying`,
        );
        await queryRunner.query(
            `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_stripeCustomerId" UNIQUE ("stripeCustomerId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`,
        );
        await queryRunner.query(
            `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_55c9f77733123bd2ead29886017"`,
        );
        await queryRunner.query(
            `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_2dfab576863bc3f84d4f6962274"`,
        );
        await queryRunner.query(
            `ALTER TABLE "plan_entitlements" DROP CONSTRAINT "FK_2fa5d0ede7adc3e27adcf88fbc4"`,
        );
        await queryRunner.query(
            `ALTER TABLE "plan_entitlements" DROP CONSTRAINT "FK_b77a22e02b7e33336ea05ac35a7"`,
        );
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TABLE "stripe_webhook_events"`);
        await queryRunner.query(`DROP TABLE "usage_counters"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_2dfab576863bc3f84d4f696227"`,
        );
        await queryRunner.query(`DROP TABLE "user_subscriptions"`);
        await queryRunner.query(
            `DROP TYPE "public"."user_subscriptions_status_enum"`,
        );
        await queryRunner.query(`DROP TABLE "plans"`);
        await queryRunner.query(`DROP TABLE "plan_entitlements"`);
        await queryRunner.query(
            `DROP TYPE "public"."plan_entitlements_period_enum"`,
        );
        await queryRunner.query(`DROP TABLE "features"`);
        await queryRunner.query(
            `DROP INDEX "public"."UQ_user_subscriptions_active_per_user"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_2dfab576863bc3f84d4f696227"`,
        );
        await queryRunner.query(`DROP TABLE "user_subscriptions"`);
    }
}
