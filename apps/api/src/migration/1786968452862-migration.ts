import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786968452862 implements MigrationInterface {
    name = 'Migration1786968452862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "stripeCustomerId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_ab9126a074980674ba95d4cd358" UNIQUE ("stripeCustomerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_ab9126a074980674ba95d4cd358"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripeCustomerId"`);
    }

}
