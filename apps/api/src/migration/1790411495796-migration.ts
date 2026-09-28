import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790411495796 implements MigrationInterface {
    name = 'Migration1790411495796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "renewal_tokens" ADD "organizationId" uuid`);
        await queryRunner.query(`ALTER TABLE "renewal_tokens" ADD "organizationSubscriptionId" uuid`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" DROP COLUMN "absoluteExpiry"`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ADD "absoluteExpiry" TIMESTAMP WITH TIME ZONE `);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ADD CONSTRAINT "FK_3a4d068289fa6c2038fb2101e5b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "RefreshToken" DROP CONSTRAINT "FK_3a4d068289fa6c2038fb2101e5b"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" DROP COLUMN "absoluteExpiry"`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ADD "absoluteExpiry" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "renewal_tokens" DROP COLUMN "organizationSubscriptionId"`);
        await queryRunner.query(`ALTER TABLE "renewal_tokens" DROP COLUMN "organizationId"`);
    }

}
