import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoveringIndexToUserSubscriptions1787566749239 implements MigrationInterface {
    name = 'AddCoveringIndexToUserSubscriptions1787566749239'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE UNIQUE INDEX "idx_stripe_webhooks_event_stripe_event_id" ON "stripe_webhook_events" ("stripeEventId")')

        await queryRunner.query('CREATE INDEX "idx_stripe_webhooks_event_types_createdAt" ON "stripe_webhook_events" ("type","createdAt" DESC)')

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_stripe_webhook_events_type_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_stripe_webhook_events_stripe_event_id"`);
    }

}
