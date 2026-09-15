import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787564709264 implements MigrationInterface {
    name = 'Migration1787564709264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_2dfab576863bc3f84d4f696227"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_user_subscriptions_created_at"`);

        const covering = await queryRunner.query(
            `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_user_id'`
        );
        if (covering.length > 0) {
            await queryRunner.query(`ALTER INDEX "public"."idx_user_subscriptions_user_id" RENAME TO "idx_user_subscriptions_covering"`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const renamed = await queryRunner.query(
            `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_covering'`
        );
        if (renamed.length > 0) {
            await queryRunner.query(`ALTER INDEX "public"."idx_user_subscriptions_covering" RENAME TO "idx_user_subscriptions_user_id"`);
        }
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_created_at" ON "public"."user_subscriptions" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_2dfab576863bc3f84d4f696227" ON "public"."user_subscriptions" ("userId")`);
    }
}