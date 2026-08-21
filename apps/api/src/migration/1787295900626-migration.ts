import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787295900626 implements MigrationInterface {
    name = 'Migration1787295900626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tasks_iscompleted_enum" AS ENUM('pending', 'done', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying NOT NULL, "userId" uuid NOT NULL, "isCompleted" "public"."tasks_iscompleted_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_profilevisibility_enum" AS ENUM('private', 'public', 'friends_only')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100), "lastName" character varying(100), "email" character varying(255) NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isEmailVerified" boolean NOT NULL DEFAULT false, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "tokenVersion" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP WITH TIME ZONE, "isAdmin" boolean NOT NULL DEFAULT false, "profileVisibility" "public"."users_profilevisibility_enum" NOT NULL DEFAULT 'private', "resetToken" character varying, "resetTokenExpiry" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP, "stripeCustomerId" character varying, "timezone" character varying NOT NULL DEFAULT 'UTC', CONSTRAINT "UQ_ab9126a074980674ba95d4cd358" UNIQUE ("stripeCustomerId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."followers_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'block')`);
        await queryRunner.query(`CREATE TABLE "followers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "followerId" uuid NOT NULL, "followingId" uuid NOT NULL, "status" "public"."followers_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_451bb9eb792c3023a164cf14e0a" UNIQUE ("followerId"), CONSTRAINT "UQ_5e34418be6d904b779ca96cf932" UNIQUE ("followingId"), CONSTRAINT "UQ_1485f24f1f66ac91ea2c5517ebd" UNIQUE ("followerId", "followingId"), CONSTRAINT "PK_c90cfc5b18edd29bd15ba95c1a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_451bb9eb792c3023a164cf14e0" ON "followers" ("followerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e34418be6d904b779ca96cf93" ON "followers" ("followingId") `);
        await queryRunner.query(`CREATE TABLE "system" ("Key" character varying NOT NULL, "value" boolean NOT NULL, CONSTRAINT "PK_9b9a30515c6db6ef55797b4c039" PRIMARY KEY ("Key"))`);
        await queryRunner.query(`CREATE TABLE "features" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "name" character varying NOT NULL, "description" text, CONSTRAINT "UQ_0cc5c687428b94489ce1edc3c5a" UNIQUE ("key"), CONSTRAINT "PK_5c1e336df2f4a7051e5bf08a941" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."plan_entitlements_period_enum" AS ENUM('daily', 'monthly', 'lifetime')`);
        await queryRunner.query(`CREATE TABLE "plan_entitlements" ("planId" uuid NOT NULL, "featureId" uuid NOT NULL, "valueLimit" integer NOT NULL, "period" "public"."plan_entitlements_period_enum" NOT NULL, CONSTRAINT "PK_5194c6fce774836b36e43fe2814" PRIMARY KEY ("planId", "featureId"))`);
        await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "stripePriceId" character varying, "isActive" boolean NOT NULL DEFAULT true, "rank" integer NOT NULL DEFAULT '0', "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'inr', "gracePeriodDays" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_95f7ef3fc4c31a3545b4d825dd4" UNIQUE ("code"), CONSTRAINT "UQ_b671aaeeecb098232ba628bf2e6" UNIQUE ("stripePriceId"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_subscriptions_status_enum" AS ENUM('active', 'past_due', 'canceled', 'incomplete')`);
        await queryRunner.query(`CREATE TABLE "user_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "planId" uuid NOT NULL, "status" "public"."user_subscriptions_status_enum" NOT NULL, "stripeSubscriptionId" character varying, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, "graceStartedAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_107c0ca30c0c632c0b711e5add7" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "PK_9e928b0954e51705ab44988812c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_SUBSCRIPTION_USER" ON "user_subscriptions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2dfab576863bc3f84d4f696227" ON "user_subscriptions" ("userId") `);
        await queryRunner.query(`CREATE TABLE "usage_counters" ("userId" uuid NOT NULL, "featureId" uuid NOT NULL, "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_755a1aeb25249b2a5319366bd9e" PRIMARY KEY ("userId", "featureId", "periodStart"))`);
        await queryRunner.query(`CREATE TABLE "stripe_webhook_events" ("stripeEventId" character varying NOT NULL, "type" character varying NOT NULL, "processedAt" TIMESTAMP WITH TIME ZONE, "payload" jsonb NOT NULL, CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018" PRIMARY KEY ("stripeEventId"))`);
        await queryRunner.query(`CREATE TABLE "renewal_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "userSubscriptionId" uuid NOT NULL, "token" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_42eafb7d7a54d46ec5e0fdfa741" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_62ee4698ac196cfc90ca54d5ff" ON "renewal_tokens" ("token") `);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('succeeded', 'failed', 'pending', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userSubscriptionId" uuid NOT NULL, "stripeInvoiceId" character varying NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL, "status" "public"."payments_status_enum" NOT NULL, "paidAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "RefreshToken" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tokenHash" character varying NOT NULL, "userId" uuid NOT NULL, "familyId" uuid NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "expireAt" TIMESTAMP WITH TIME ZONE NOT NULL, "absoluteExpiry" TIMESTAMP NOT NULL, "userAgent" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "PK_e5efef1572bd829464edc903d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f4196ffde5751987510a646820" ON "RefreshToken" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_da7923626f057e69c600bb2063" ON "RefreshToken" ("familyId") `);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_5e34418be6d904b779ca96cf932" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" ADD CONSTRAINT "FK_b77a22e02b7e33336ea05ac35a7" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" ADD CONSTRAINT "FK_2fa5d0ede7adc3e27adcf88fbc4" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_2dfab576863bc3f84d4f6962274" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_55c9f77733123bd2ead29886017" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_55c9f77733123bd2ead29886017"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_2dfab576863bc3f84d4f6962274"`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" DROP CONSTRAINT "FK_2fa5d0ede7adc3e27adcf88fbc4"`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" DROP CONSTRAINT "FK_b77a22e02b7e33336ea05ac35a7"`);
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_5e34418be6d904b779ca96cf932"`);
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da7923626f057e69c600bb2063"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4196ffde5751987510a646820"`);
        await queryRunner.query(`DROP TABLE "RefreshToken"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62ee4698ac196cfc90ca54d5ff"`);
        await queryRunner.query(`DROP TABLE "renewal_tokens"`);
        await queryRunner.query(`DROP TABLE "stripe_webhook_events"`);
        await queryRunner.query(`DROP TABLE "usage_counters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dfab576863bc3f84d4f696227"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_SUBSCRIPTION_USER"`);
        await queryRunner.query(`DROP TABLE "user_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."user_subscriptions_status_enum"`);
        await queryRunner.query(`DROP TABLE "plans"`);
        await queryRunner.query(`DROP TABLE "plan_entitlements"`);
        await queryRunner.query(`DROP TYPE "public"."plan_entitlements_period_enum"`);
        await queryRunner.query(`DROP TABLE "features"`);
        await queryRunner.query(`DROP TABLE "system"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e34418be6d904b779ca96cf93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_451bb9eb792c3023a164cf14e0"`);
        await queryRunner.query(`DROP TABLE "followers"`);
        await queryRunner.query(`DROP TYPE "public"."followers_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_profilevisibility_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_iscompleted_enum"`);
    }

}
