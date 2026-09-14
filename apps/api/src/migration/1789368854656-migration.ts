import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789368854656 implements MigrationInterface {
    name = 'Migration1789368854656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."chat_messages_type_enum" AS ENUM('text', 'image')`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD "type" "public"."chat_messages_type_enum" NOT NULL DEFAULT 'text'`);
        await queryRunner.query(`CREATE TYPE "public"."chat_messages_status_enum" AS ENUM('sent', 'processing', 'ready', 'failed')`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD "status" "public"."chat_messages_status_enum" NOT NULL DEFAULT 'sent'`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD "attachment" jsonb`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ALTER COLUMN "content" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_messages" ALTER COLUMN "content" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN "attachment"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."chat_messages_status_enum"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."chat_messages_type_enum"`);
    }

}
