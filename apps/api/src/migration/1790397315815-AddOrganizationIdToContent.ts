import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeContentOrganizationIdRequired1790400000000 implements MigrationInterface {
    name = 'MakeContentOrganizationIdRequired1790400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "content" ALTER COLUMN "organizationId" SET NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "content" ALTER COLUMN "organizationId" DROP NOT NULL;
        `);
    }
}