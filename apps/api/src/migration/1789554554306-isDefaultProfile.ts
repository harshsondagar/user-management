import { MigrationInterface, QueryRunner } from "typeorm";

export class IsDefaultProfile1789554554306 implements MigrationInterface {
  name = 'AddPrimaryProfileFlag1700000000003';


  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "profiles" ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION protect_primary_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_primary = true THEN
          IF NEW.deleted_at IS NOT NULL THEN
            RAISE EXCEPTION 'PRIMARY_PROFILE_UNDELETABLE: profile % is primary and cannot be deleted directly',
              OLD.id USING ERRCODE = 'P0002';
          END IF;
          IF NEW.is_primary = false THEN
            RAISE EXCEPTION 'PRIMARY_PROFILE_IMMUTABLE: profile % is primary and its flag cannot be unset',
              OLD.id USING ERRCODE = 'P0003';
          END IF;
        END IF;
        RETURN NEW;
      END;  
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_protect_primary_profile
      BEFORE UPDATE ON "profiles"
      FOR EACH ROW EXECUTE FUNCTION protect_primary_profile();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_protect_primary_profile ON "profiles";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS protect_primary_profile();`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "is_primary";`);
  }

}
