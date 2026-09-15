import { MigrationInterface, QueryRunner } from "typeorm";

export class FixStripeWebhookEventsIndexes1787570871933 implements MigrationInterface {

    name = 'FixStripeWebhookEventsIndexes1787570871933'
    public async up(queryRunner: QueryRunner): Promise<void> {
        // redundant — PK_0cd20ab615b5a55f84accf8a018 already uniquely indexes stripeEventId
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_stripe_webhooks_event_stripe_event_id"`);

        // no confirmed query pattern filtering/sorting by type — drop until one exists
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_stripe_webhooks_event_types_createdAt"`);

        // the actual agreed index: fast lookup of unprocessed events, oldest-first
        await queryRunner.query(`
            CREATE INDEX "idx_stripe_webhook_events_unprocessed" 
            ON "stripe_webhook_events" ("createdAt") 
            WHERE "processedAt" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_stripe_webhook_events_unprocessed"`);
        await queryRunner.query(`
            CREATE INDEX "idx_stripe_webhooks_event_types_createdAt" 
            ON "public"."stripe_webhook_events" ("type", "createdAt" DESC)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_stripe_webhooks_event_stripe_event_id" 
            ON "public"."stripe_webhook_events" ("stripeEventId")
        `);
    }
}
