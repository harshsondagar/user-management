import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785146058035 implements MigrationInterface {
    name = 'Migration1785146058035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "resetToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetToken"`);
    }

}
