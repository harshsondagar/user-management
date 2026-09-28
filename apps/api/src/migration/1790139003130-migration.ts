import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790139003130 implements MigrationInterface {
    name = 'Migration1790139003130'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_org_subscriptions_organization_id"`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd"`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ALTER COLUMN "organizationId" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."subscription_status_enum" RENAME TO "subscription_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."organization_subscriptions_status_enum" AS ENUM('active', 'past_due', 'canceled', 'incomplete')`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."organization_subscriptions_status_enum" USING "status"::"text"::"public"."organization_subscriptions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."subscription_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "userSubscriptionId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_org_subscriptions_organization_id" ON "organization_subscriptions" ("organizationId") `);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_0c6e691023c3663da25bb7efce2" FOREIGN KEY ("organizationSubscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_0c6e691023c3663da25bb7efce2"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ae2c8a68a95c06497086c055887"`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`DROP INDEX "public"."idx_org_subscriptions_organization_id"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "userSubscriptionId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ae2c8a68a95c06497086c055887" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."subscription_status_enum_old" AS ENUM('active', 'canceled', 'past_due')`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."subscription_status_enum_old" USING "status"::"text"::"public"."subscription_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."organization_subscriptions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."subscription_status_enum_old" RENAME TO "subscription_status_enum"`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ALTER COLUMN "organizationId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ADD "organization_id" uuid NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_org_subscriptions_organization_id" ON "organization_subscriptions" ("organization_id") `);
    }

}
