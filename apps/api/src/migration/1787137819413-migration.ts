import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787137819413 implements MigrationInterface {
    name = 'Migration1787137819413'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "graceStartedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "graceStartedAt"`);
    }

}
