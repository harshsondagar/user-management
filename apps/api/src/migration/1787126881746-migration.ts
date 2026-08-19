import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787126881746 implements MigrationInterface {
    name = 'Migration1787126881746'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "timezone" character varying NOT NULL DEFAULT 'UTC'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    }

}
