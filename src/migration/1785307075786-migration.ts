import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785307075786 implements MigrationInterface {
    name = 'Migration1785307075786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tasks_iscompleted_enum" AS ENUM('pending', 'done', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying NOT NULL, "userId" uuid NOT NULL, "isCompleted" "public"."tasks_iscompleted_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_profilevisibility_enum" AS ENUM('private', 'public', 'friends_only')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100), "lastName" character varying(100), "email" character varying(255) NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isEmailVerified" boolean NOT NULL DEFAULT false, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "tokenVersion" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP WITH TIME ZONE, "isAdmin" boolean NOT NULL DEFAULT false, "profileVisibility" "public"."users_profilevisibility_enum" NOT NULL DEFAULT 'private', "resetToken" character varying, "resetTokenExpiry" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."followers_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'block')`);
        await queryRunner.query(`CREATE TABLE "followers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "followerId" uuid NOT NULL, "followingId" uuid NOT NULL, "status" "public"."followers_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_451bb9eb792c3023a164cf14e0a" UNIQUE ("followerId"), CONSTRAINT "UQ_5e34418be6d904b779ca96cf932" UNIQUE ("followingId"), CONSTRAINT "UQ_1485f24f1f66ac91ea2c5517ebd" UNIQUE ("followerId", "followingId"), CONSTRAINT "PK_c90cfc5b18edd29bd15ba95c1a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_451bb9eb792c3023a164cf14e0" ON "followers" ("followerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e34418be6d904b779ca96cf93" ON "followers" ("followingId") `);
        await queryRunner.query(`CREATE TABLE "system" ("Key" character varying NOT NULL, "value" boolean NOT NULL, CONSTRAINT "PK_9b9a30515c6db6ef55797b4c039" PRIMARY KEY ("Key"))`);
        await queryRunner.query(`CREATE TABLE "RefreshToken" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tokenHash" character varying NOT NULL, "userId" uuid NOT NULL, "familyId" uuid NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "expireAt" TIMESTAMP WITH TIME ZONE NOT NULL, "absoluteExpiry" TIMESTAMP NOT NULL, "userAgent" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "PK_e5efef1572bd829464edc903d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f4196ffde5751987510a646820" ON "RefreshToken" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_da7923626f057e69c600bb2063" ON "RefreshToken" ("familyId") `);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "followers" ADD CONSTRAINT "FK_5e34418be6d904b779ca96cf932" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_5e34418be6d904b779ca96cf932"`);
        await queryRunner.query(`ALTER TABLE "followers" DROP CONSTRAINT "FK_451bb9eb792c3023a164cf14e0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da7923626f057e69c600bb2063"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4196ffde5751987510a646820"`);
        await queryRunner.query(`DROP TABLE "RefreshToken"`);
        await queryRunner.query(`DROP TABLE "system"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e34418be6d904b779ca96cf93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_451bb9eb792c3023a164cf14e0"`);
        await queryRunner.query(`DROP TABLE "followers"`);
        await queryRunner.query(`DROP TYPE "public"."followers_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_profilevisibility_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_iscompleted_enum"`);
    }

}
