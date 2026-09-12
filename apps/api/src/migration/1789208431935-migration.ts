import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789208431935 implements MigrationInterface {
    name = 'Migration1789208431935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chat_messages" ("id" uuid NOT NULL, "roomId" uuid NOT NULL, "userId" uuid NOT NULL, "content" character varying(2000) NOT NULL, "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9fa0373c1451ad384fc6a74aa8" ON "chat_messages" ("roomId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9fa0373c1451ad384fc6a74aa8"`);
        await queryRunner.query(`DROP TABLE "chat_messages"`);
    }

}
