import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789552811568 implements MigrationInterface {
    name = 'Migration1789552811568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."plan_streaming_policies_max_video_quality_enum" AS ENUM('sd', 'hd', 'full_hd', 'uhd_4k')`);
        await queryRunner.query(`CREATE TYPE "public"."plan_streaming_policies_audio_qualities_enum" AS ENUM('stereo', 'dolby_5_1', 'dolby_atmos')`);
        await queryRunner.query(`CREATE TYPE "public"."plan_streaming_policies_allowed_devices_enum" AS ENUM('mobile', 'tablet', 'computer', 'smart_tv', 'game_console')`);
        await queryRunner.query(`CREATE TABLE "plan_streaming_policies" ("plan_id" uuid NOT NULL, "max_video_quality" "public"."plan_streaming_policies_max_video_quality_enum" NOT NULL DEFAULT 'hd', "audio_qualities" "public"."plan_streaming_policies_audio_qualities_enum" array NOT NULL DEFAULT '{stereo}', "allowed_devices" "public"."plan_streaming_policies_allowed_devices_enum" array NOT NULL DEFAULT '{mobile,computer}', "max_concurrent_streams" smallint NOT NULL DEFAULT '1', "max_concurrent_downloads" smallint NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d860a74aef0029e5269d5bd87ce" PRIMARY KEY ("plan_id"))`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" DROP COLUMN "config"`);
        await queryRunner.query(`ALTER TABLE "plan_streaming_policies" ADD CONSTRAINT "FK_d860a74aef0029e5269d5bd87ce" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plan_streaming_policies" DROP CONSTRAINT "FK_d860a74aef0029e5269d5bd87ce"`);
        await queryRunner.query(`ALTER TABLE "plan_entitlements" ADD "config" jsonb`);
        await queryRunner.query(`DROP TABLE "plan_streaming_policies"`);
        await queryRunner.query(`DROP TYPE "public"."plan_streaming_policies_allowed_devices_enum"`);
        await queryRunner.query(`DROP TYPE "public"."plan_streaming_policies_audio_qualities_enum"`);
        await queryRunner.query(`DROP TYPE "public"."plan_streaming_policies_max_video_quality_enum"`);
    }

}
