import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787026485851 implements MigrationInterface {
    name = 'Migration1787026485851'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "stripeEventId"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "stripeEventId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018" PRIMARY KEY ("stripeEventId")`);
        await queryRunner.query(`CREATE INDEX "IDX_SUBSCRIPTION_USER" ON "user_subscriptions" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_SUBSCRIPTION_USER"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "stripeEventId"`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "stripeEventId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD CONSTRAINT "PK_0cd20ab615b5a55f84accf8a018" PRIMARY KEY ("stripeEventId")`);
    }

}
