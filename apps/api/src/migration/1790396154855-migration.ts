import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790396154855 implements MigrationInterface {
    name = 'Migration1790396154855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "organizationId" uuid`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_72e052028ad54548c1fedbca5af" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_72e052028ad54548c1fedbca5af"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "organizationId"`);
    }

}
