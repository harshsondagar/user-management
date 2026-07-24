import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784869465799 implements MigrationInterface {
    name = 'Migration1784869465799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."followers_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'block')`);
        await queryRunner.query(`CREATE TABLE "followers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "followerId" uuid NOT NULL, "followingId" uuid NOT NULL, "status" "public"."followers_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_451bb9eb792c3023a164cf14e0a" UNIQUE ("followerId"), CONSTRAINT "UQ_5e34418be6d904b779ca96cf932" UNIQUE ("followingId"), CONSTRAINT "UQ_1485f24f1f66ac91ea2c5517ebd" UNIQUE ("followerId", "followingId"), CONSTRAINT "PK_c90cfc5b18edd29bd15ba95c1a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_451bb9eb792c3023a164cf14e0" ON "followers"  ("followerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e34418be6d904b779ca96cf93" ON "followers"  ("followingId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_profilevisibility_enum" AS ENUM('private', 'public', 'friends_only')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "profileVisibility" "public"."users_profilevisibility_enum" NOT NULL DEFAULT 'private'`);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_5e34418be6d904b779ca96cf932" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_5e34418be6d904b779ca96cf932"`);
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profileVisibility"`);
        await queryRunner.query(`DROP TYPE "public"."users_profilevisibility_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e34418be6d904b779ca96cf93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_451bb9eb792c3023a164cf14e0"`);
        await queryRunner.query(`DROP TABLE "followers"`);
        await queryRunner.query(`DROP TYPE "public"."followers_status_enum"`);
    }

}
