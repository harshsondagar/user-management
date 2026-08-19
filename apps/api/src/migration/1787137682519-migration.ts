import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787137682519 implements MigrationInterface {
    name = 'Migration1787137682519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "renewal_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "userSubscriptionId" uuid NOT NULL, "token" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_42eafb7d7a54d46ec5e0fdfa741" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_62ee4698ac196cfc90ca54d5ff" ON "renewal_tokens" ("token") `);
        await queryRunner.query(`ALTER TABLE "plans" ADD "gracePeriodDays" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "gracePeriodDays"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62ee4698ac196cfc90ca54d5ff"`);
        await queryRunner.query(`DROP TABLE "renewal_tokens"`);
    }

}
