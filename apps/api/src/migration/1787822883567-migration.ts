import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787822883567 implements MigrationInterface {
    name = 'Migration1787822883567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "features" DROP COLUMN "features_by"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "features" ADD "features_by" character varying`);
    }

}
