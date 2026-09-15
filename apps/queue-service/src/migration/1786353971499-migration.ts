import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786353971499 implements MigrationInterface {
    name = 'Migration1786353971499'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Scrap" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100), "lastName" character varying(100), "elName" character varying(100), "isActive" boolean NOT NULL, CONSTRAINT "PK_d7d9b2499a9ba85ae18c3ae3ede" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "mail_failures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobName" character varying NOT NULL, "recipientEmail" character varying NOT NULL, "bullJobId" character varying NOT NULL, "errorMessage" text NOT NULL, "attemptsMade" integer NOT NULL, "jobData" jsonb, "failedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c55e3da710694cbd7c1ace74fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da5b3f235eb1e6d4c182d322a6" ON "mail_failures" ("jobName") `);
        await queryRunner.query(`CREATE INDEX "IDX_682fb81eff5b45bdf00f79b8b4" ON "mail_failures" ("recipientEmail") `);
        await queryRunner.query(`CREATE INDEX "IDX_cbd3ab836d8802f177d2dd620e" ON "mail_failures" ("failedAt") `);
        await queryRunner.query(`CREATE TYPE "public"."dead_letter_entries_failurescope_enum" AS ENUM('resource', 'job', 'search')`);
        await queryRunner.query(`CREATE TYPE "public"."dead_letter_entries_status_enum" AS ENUM('pending_retry', 'permanently_failed', 'resolved', 'ignored')`);
        await queryRunner.query(`CREATE TABLE "dead_letter_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "failureScope" "public"."dead_letter_entries_failurescope_enum" NOT NULL, "status" "public"."dead_letter_entries_status_enum" NOT NULL DEFAULT 'pending_retry', "resourceId" character varying, "nid" bigint, "title" character varying, "query" character varying, "bullJobId" character varying, "userId" character varying, "errorMessage" text NOT NULL, "errorStack" text, "retryErrorMessage" text, "attemptCount" integer NOT NULL DEFAULT '1', "rawContext" jsonb, "firstFailedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastAttemptedAt" TIMESTAMP, "notifiedAt" TIMESTAMP, "resolvedBy" character varying, "resolvedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ed3e9080458f823199695dd7a55" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d202c0fd5f26d30e1e0e0d96b3" ON "dead_letter_entries" ("failureScope") `);
        await queryRunner.query(`CREATE INDEX "IDX_6ff4e121023a2f5f3eccb4349e" ON "dead_letter_entries" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9ec3c9d54ec4594e33ff7b0891" ON "dead_letter_entries" ("resourceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1cf2ba5d934bcda0e96d3256ee" ON "dead_letter_entries" ("nid") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1cf2ba5d934bcda0e96d3256ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ec3c9d54ec4594e33ff7b0891"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ff4e121023a2f5f3eccb4349e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d202c0fd5f26d30e1e0e0d96b3"`);
        await queryRunner.query(`DROP TABLE "dead_letter_entries"`);
        await queryRunner.query(`DROP TYPE "public"."dead_letter_entries_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dead_letter_entries_failurescope_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cbd3ab836d8802f177d2dd620e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_682fb81eff5b45bdf00f79b8b4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da5b3f235eb1e6d4c182d322a6"`);
        await queryRunner.query(`DROP TABLE "mail_failures"`);
        await queryRunner.query(`DROP TABLE "Scrap"`);
    }

}
