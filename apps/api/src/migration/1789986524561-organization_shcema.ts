import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationRbac1700000000006 implements MigrationInterface {
    name = 'CreateOrganizationRbac1700000000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ---------- organizations ----------
        await queryRunner.query(`
      CREATE TYPE "organization_type_enum" AS ENUM ('personal', 'team');
    `);
        await queryRunner.query(`
      CREATE TYPE "org_status_enum" AS ENUM ('active', 'suspended', 'deleted');
    `);
        await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_name" varchar(100) NOT NULL,
        "type" "organization_type_enum" NOT NULL,
        "owner_user_id" uuid NOT NULL,
        "status" "org_status_enum" NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_organizations_owner_user_id" FOREIGN KEY ("owner_user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

        // ---------- permissions ----------
        await queryRunner.query(`
      CREATE TABLE "permissions" (
        "permission_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "permission_key" varchar(100) NOT NULL,
        "description" varchar(255),
        CONSTRAINT "pk_permissions" PRIMARY KEY ("permission_id"),
        CONSTRAINT "uq_permissions_permission_key" UNIQUE ("permission_key")
      );
    `);

        // ---------- roles ----------
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "role_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid,
        "role_name" varchar(50) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_roles" PRIMARY KEY ("role_id"),
        CONSTRAINT "fk_roles_organization_id" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      );
    `);
        await queryRunner.query(`CREATE INDEX "idx_roles_organization_id" ON "roles" ("organization_id");`);
        // Two SEPARATE partial unique indexes, not one plain UNIQUE(organization_id, role_name):
        // Postgres treats every NULL as distinct from every other NULL in a
        // unique constraint, so a plain UNIQUE on a nullable organization_id
        // would let unlimited duplicate-named system templates (organization_id
        // IS NULL) slip through while still correctly enforcing per-org
        // uniqueness for real orgs. Splitting into two partial indexes closes
        // that gap explicitly instead of relying on NULL semantics no one
        // reading this table would guess correctly.
        await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_org_role_name" ON "roles" ("organization_id", "role_name")
      WHERE "organization_id" IS NOT NULL;
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_system_role_name" ON "roles" ("role_name")
      WHERE "organization_id" IS NULL;
    `);

        // ---------- role_permissions (explicit junction entity, not an
        // implicit TypeORM-managed join table - see RolePermission entity) ----------
        await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_role_permissions_role_id" FOREIGN KEY ("role_id")
          REFERENCES "roles"("role_id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission_id" FOREIGN KEY ("permission_id")
          REFERENCES "permissions"("permission_id") ON DELETE CASCADE,
        CONSTRAINT "uq_role_permissions_role_id_permission_id" UNIQUE ("role_id", "permission_id")
      );
    `);
        await queryRunner.query(`CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" ("role_id");`);
        await queryRunner.query(`CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions" ("permission_id");`);

        // ---------- members ----------
        await queryRunner.query(`
      CREATE TYPE "member_status_enum" AS ENUM ('invited', 'active', 'removed');
    `);
        await queryRunner.query(`
      CREATE TABLE "members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "status" "member_status_enum" NOT NULL DEFAULT 'invited',
        "invited_by_user_id" uuid,
        "joined_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_members" PRIMARY KEY ("id"),
        CONSTRAINT "fk_members_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_organization_id" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_members_user_id_organization_id" UNIQUE ("user_id", "organization_id")
      );
    `);
        await queryRunner.query(`CREATE INDEX "idx_members_user_id" ON "members" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_members_organization_id" ON "members" ("organization_id");`);

        // ---------- organization_member_roles ----------
        await queryRunner.query(`
      CREATE TABLE "organization_member_roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "member_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "assigned_by_user_id" uuid,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_member_roles" PRIMARY KEY ("id"),
        CONSTRAINT "fk_org_member_roles_member_id" FOREIGN KEY ("member_id")
          REFERENCES "members"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_org_member_roles_role_id" FOREIGN KEY ("role_id")
          REFERENCES "roles"("role_id") ON DELETE CASCADE,
        CONSTRAINT "uq_org_member_roles_member_id_role_id" UNIQUE ("member_id", "role_id")
      );
    `);
        await queryRunner.query(`CREATE INDEX "idx_org_member_roles_member_id" ON "organization_member_roles" ("member_id");`);
        await queryRunner.query(`CREATE INDEX "idx_org_member_roles_role_id" ON "organization_member_roles" ("role_id");`);

        // ---------- organization_invites ----------
        await queryRunner.query(`
      CREATE TYPE "invite_status_enum" AS ENUM ('pending', 'accepted', 'expired', 'revoked');
    `);
        await queryRunner.query(`
      CREATE TABLE "organization_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "email" varchar NOT NULL,
        "role_id" uuid,
        "invited_by_user_id" uuid NOT NULL,
        "token_hash" varchar NOT NULL,
        "status" "invite_status_enum" NOT NULL DEFAULT 'pending',
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_invites" PRIMARY KEY ("id"),
        CONSTRAINT "fk_org_invites_organization_id" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_org_invites_role_id" FOREIGN KEY ("role_id")
          REFERENCES "roles"("role_id") ON DELETE SET NULL,
        CONSTRAINT "uq_org_invites_token_hash" UNIQUE ("token_hash")
      );
    `);
        await queryRunner.query(`CREATE INDEX "idx_org_invites_organization_id" ON "organization_invites" ("organization_id");`);
        await queryRunner.query(`CREATE INDEX "idx_org_invites_email" ON "organization_invites" ("email");`);

        // ---------- plans.scope (individual vs organization billing) ----------
        await queryRunner.query(`
      CREATE TYPE "plan_scope_enum" AS ENUM ('individual', 'organization');
    `);
        await queryRunner.query(`
      ALTER TABLE "plans" ADD COLUMN "scope" "plan_scope_enum" NOT NULL DEFAULT 'individual';
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "scope";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "plan_scope_enum";`);

        await queryRunner.query(`DROP TABLE IF EXISTS "organization_invites";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "invite_status_enum";`);

        await queryRunner.query(`DROP TABLE IF EXISTS "organization_member_roles";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "members";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "member_status_enum";`);

        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "uq_roles_system_role_name";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "uq_roles_org_role_name";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);

        await queryRunner.query(`DROP TABLE IF EXISTS "permissions";`);

        await queryRunner.query(`DROP TABLE IF EXISTS "organizations";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "org_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "organization_type_enum";`);
    }
}