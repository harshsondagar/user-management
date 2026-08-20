import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787217611891 implements MigrationInterface {
    name = 'Migration1787217611891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "amount" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "amount" SET DEFAULT '0'`);
    }

}
