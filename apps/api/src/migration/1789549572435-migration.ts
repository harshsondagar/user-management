import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789549572435 implements MigrationInterface {
    name = 'Migration1789549572435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."content_status_enum" AS ENUM('draft', 'published', 'archived')`);
        await queryRunner.query(`ALTER TABLE "content" ADD "status" "public"."content_status_enum" NOT NULL DEFAULT 'draft'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."content_status_enum"`);
    }

}
