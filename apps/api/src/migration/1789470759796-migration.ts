import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789470759796 implements MigrationInterface {
    name = 'Migration1789470759796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "uq_watch_history_profile_content"`);
        await queryRunner.query(`CREATE TABLE "episodes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "season_id" uuid NOT NULL, "episode_number" smallint NOT NULL, "title" character varying(255) NOT NULL, "synopsis" text, "duration_seconds" integer NOT NULL, "video_url" text NOT NULL, "thumbnail_url" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_episodes_season_id_episode_number" UNIQUE ("season_id", "episode_number"), CONSTRAINT "PK_6a003fda8b0473fffc39cb831c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_episodes_season_id" ON "episodes" ("season_id") `);
        await queryRunner.query(`CREATE TABLE "seasons" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "series_id" uuid NOT NULL, "season_number" smallint NOT NULL, "title" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_seasons_series_id_season_number" UNIQUE ("series_id", "season_number"), CONSTRAINT "PK_cb8ed53b5fe109dcd4a4449ec9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_seasons_series_id" ON "seasons" ("series_id") `);
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum" AS ENUM('MOVIE', 'SERIES')`);
        await queryRunner.query(`CREATE TABLE "content" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."content_type_enum" NOT NULL, "title" character varying(255) NOT NULL, "synopsis" text, "release_year" smallint, "poster_url" text, "backdrop_url" text, "maturity_level" smallint NOT NULL, "duration_seconds" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_content_type" ON "content" ("type") `);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD "episode_id" uuid`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "content_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "chk_watch_history_exactly_one_target" CHECK (("content_id" IS NOT NULL AND "episode_id" IS NULL) OR ("content_id" IS NULL AND "episode_id" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD CONSTRAINT "FK_8fc013f436d72d36ab6a5af746f" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "seasons" ADD CONSTRAINT "FK_c5d98a37f5d9e20dcd4196c04a8" FOREIGN KEY ("series_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_2e3d78f45d9690d5c856d3e9db9" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_314147a1dae35e41c476eae1683" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watchlist_items" DROP CONSTRAINT "FK_06b4cbb683b730a8649447216fd"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_314147a1dae35e41c476eae1683"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_2e3d78f45d9690d5c856d3e9db9"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2"`);
        await queryRunner.query(`ALTER TABLE "seasons" DROP CONSTRAINT "FK_c5d98a37f5d9e20dcd4196c04a8"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP CONSTRAINT "FK_8fc013f436d72d36ab6a5af746f"`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP CONSTRAINT "chk_watch_history_exactly_one_target"`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ADD CONSTRAINT "FK_06b4cbb683b730a8649447216fd" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "FK_42e23cf9852981b38e9bbaa96a2" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "watchlist_items" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "content_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "watch_history" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "watch_history" DROP COLUMN "episode_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_content_type"`);
        await queryRunner.query(`DROP TABLE "content"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_seasons_series_id"`);
        await queryRunner.query(`DROP TABLE "seasons"`);
        await queryRunner.query(`DROP INDEX "public"."idx_episodes_season_id"`);
        await queryRunner.query(`DROP TABLE "episodes"`);
        await queryRunner.query(`ALTER TABLE "watch_history" ADD CONSTRAINT "uq_watch_history_profile_content" UNIQUE ("content_id", "profile_id")`);
    }

}
