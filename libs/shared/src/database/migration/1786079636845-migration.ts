import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786079636845 implements MigrationInterface {
    name = 'Migration1786079636845'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "mail_failures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobName" character varying NOT NULL, "recipientEmail" character varying NOT NULL, "bullJobId" character varying NOT NULL, "errorMessage" text NOT NULL, "attemptsMade" integer NOT NULL, "jobData" jsonb, "failedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c55e3da710694cbd7c1ace74fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da5b3f235eb1e6d4c182d322a6" ON "mail_failures" ("jobName") `);
        await queryRunner.query(`CREATE INDEX "IDX_682fb81eff5b45bdf00f79b8b4" ON "mail_failures" ("recipientEmail") `);
        await queryRunner.query(`CREATE INDEX "IDX_cbd3ab836d8802f177d2dd620e" ON "mail_failures" ("failedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_cbd3ab836d8802f177d2dd620e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_682fb81eff5b45bdf00f79b8b4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da5b3f235eb1e6d4c182d322a6"`);
        await queryRunner.query(`DROP TABLE "mail_failures"`);
    }

}
