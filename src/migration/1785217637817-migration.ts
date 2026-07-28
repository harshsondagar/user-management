import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785217637817 implements MigrationInterface {
    name = 'Migration1785217637817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "resetTokenExpiry" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetTokenExpiry"`);
    }

}
