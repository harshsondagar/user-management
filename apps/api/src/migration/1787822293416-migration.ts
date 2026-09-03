import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787822293416 implements MigrationInterface {
    name = 'Migration1787822293416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_user_subscriptions_covering"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_subscriptions_userid_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_stripe_webhook_events_unprocessed"`);
        await queryRunner.query(`ALTER TABLE "features" ADD "featureFor" character varying `);
        await queryRunner.query(`CREATE INDEX "IDX_2dfab576863bc3f84d4f696227" ON "user_subscriptions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_user_subscriptions_created_at" ON "user_subscriptions" ("createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_user_subscriptions_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_subscriptions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dfab576863bc3f84d4f696227"`);
        await queryRunner.query(`ALTER TABLE "features" DROP COLUMN "featureFor"`);
        await queryRunner.query(`CREATE INDEX "idx_stripe_webhook_events_unprocessed" ON "stripe_webhook_events" ("createdAt") WHERE ("processedAt" IS NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_user_subscriptions_userid_status" ON "user_subscriptions" ("status", "userId") `);
        await queryRunner.query(`CREATE INDEX "idx_user_subscriptions_covering" ON "user_subscriptions" ("createdAt", "currentPeriodEnd", "planId", "status", "userId") `);
    }

}
