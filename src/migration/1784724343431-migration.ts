import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784724343431 implements MigrationInterface {
    name = 'Migration1784724343431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying NOT NULL, "userId" uuid NOT NULL, "isCompleted" "public"."tasks_iscompleted_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100), "lastName" character varying(100), "email" character varying(255) NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isEmailVerified" boolean NOT NULL DEFAULT false, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "tokenVersion" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP WITH TIME ZONE, "isAdmin" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `);
        await queryRunner.query(`CREATE TABLE "RefreshToken" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tokenHash" character varying NOT NULL, "userId" uuid NOT NULL, "familyId" uuid NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "expireAt" TIMESTAMP WITH TIME ZONE NOT NULL, "userAgent" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "PK_e5efef1572bd829464edc903d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f4196ffde5751987510a646820" ON "RefreshToken"  ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_da7923626f057e69c600bb2063" ON "RefreshToken"  ("familyId") `);
        await queryRunner.query(`CREATE TABLE "system" ("Key" character varying NOT NULL, "value" boolean NOT NULL, CONSTRAINT "PK_9b9a30515c6db6ef55797b4c039" PRIMARY KEY ("Key"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "system"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da7923626f057e69c600bb2063"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4196ffde5751987510a646820"`);
        await queryRunner.query(`DROP TABLE "RefreshToken"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
    }

}
