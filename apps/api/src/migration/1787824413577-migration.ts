import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787824413577 implements MigrationInterface {
    name = 'Migration1787824413577'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "UQ_107c0ca30c0c632c0b711e5add7"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "stripeSubscriptionId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "stripeSubscriptionId" character varying`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "UQ_107c0ca30c0c632c0b711e5add7" UNIQUE ("stripeSubscriptionId")`);
    }

}
