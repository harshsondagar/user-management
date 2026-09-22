import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790076509469 implements MigrationInterface {
    name = 'Migration1790076509469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscription_status_enum" AS ENUM('active', 'canceled', 'past_due')`);
        await queryRunner.query(`CREATE TABLE "organization_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "planId" uuid NOT NULL, "status" "public"."subscription_status_enum" NOT NULL, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, "graceStartedAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid, CONSTRAINT "PK_64e17f1dc8ebe056b49e751a494" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_org_subscriptions_organization_id" ON "organization_subscriptions" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "idx_org_subscriptions_created_at" ON "organization_subscriptions" ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_4ff83b571a6a52ae494a4b9c0c5" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_4ff83b571a6a52ae494a4b9c0c5"`);
        await queryRunner.query(`ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP INDEX "public"."idx_org_subscriptions_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_org_subscriptions_organization_id"`);
        await queryRunner.query(`DROP TABLE "organization_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscription_status_enum"`);
    }

}
