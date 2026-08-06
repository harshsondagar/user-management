import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785921605197 implements MigrationInterface {
    name = 'Migration1785921605197'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }

}
