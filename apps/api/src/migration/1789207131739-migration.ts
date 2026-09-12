import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789207131739 implements MigrationInterface {
    name = 'Migration1789207131739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "room_invite_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "token" character varying(20) NOT NULL, "createdBy" uuid NOT NULL, "maxUses" integer, "useCount" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_22266e86d3bf9f57d3e2680f2bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_651816264af8480acac4300db2" ON "room_invite_links" ("token") `);
        await queryRunner.query(`ALTER TABLE "room_invite_links" ADD CONSTRAINT "FK_a3f681ce88de0823c54437f4428" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_invite_links" DROP CONSTRAINT "FK_a3f681ce88de0823c54437f4428"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_651816264af8480acac4300db2"`);
        await queryRunner.query(`DROP TABLE "room_invite_links"`);
    }

}
