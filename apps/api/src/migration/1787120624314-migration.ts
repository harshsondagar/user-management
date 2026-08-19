import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787120624314 implements MigrationInterface {
    name = 'Migration1787120624314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" ADD "rank" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "rank"`);
    }

}
