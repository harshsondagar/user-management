import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787822410082 implements MigrationInterface {
    name = 'Migration1787822410082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "features" RENAME COLUMN "featureFor" TO "features_by"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "features" RENAME COLUMN "features_by" TO "featureFor"`);
    }

}
