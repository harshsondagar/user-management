import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787306330048 implements MigrationInterface {
    name = 'Migration1787306330048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stripe_webhook_events" DROP COLUMN "createdAt"`);
    }

}
