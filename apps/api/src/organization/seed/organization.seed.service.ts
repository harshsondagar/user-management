import { dataSource } from "../../config/data-source";
import { Permission } from "../entities/permission-entity";
import { Role } from "../entities/role-entity";
import { RolePermission } from "../entities/role.permission-entity";


export const PERMISSIONS = {
    ORG_MANAGE_MEMBERS: 'org:manage_members',
    ORG_MANAGE_ROLES: 'org:manage_roles',
    ORG_MANAGE_DELETE: 'org:delete',
    ORG_MANAGE_BILLING: 'org:manage_billing',
    ORG_UPDATE_SETTINGS: 'org:update_settings',

} as const;


export const SYSTEM_PERMISSIONS = [
    { key: 'content:read', description: 'Can view content,posts and pages' },
    { key: 'content:write', description: 'Can create and edit draft content posts' },
    { key: 'content:delete', description: 'Can permanently delete content' },
    { key: 'content:publish', description: 'Can make blog posts public live' },
    { key: 'org:manage_members', description: 'Can invite, remove, and manage organization members' },
    { key: 'org:manage_roles', description: 'Can create, edit, and delete custom roles' },
    { key: 'org:manage_billing', description: 'Can manage the organization\'s subscription and billing' },
];

export const SYSTEM_ROLE_TEMPLATES = [
    {
        roleName: 'Content_Admin', // equivalent to Blog_Admin
        description: 'Full administrative access to manage and publish blog content',
        permissionKeys: ['content:read', 'content:write', 'content:delete', 'content:publish'],
    },
    {
        roleName: 'Content_Viewer', // equivalent to Blog_Viewer
        description: 'Read-only access to view blog drafts and published content',
        permissionKeys: ['content:read'],
    },
    {
        roleName: 'Org_Admin',
        description: 'Full control over the organization itself, plus content',
        permissionKeys: [
            'org:manage_members',
            'org:manage_roles',
            'org:manage_billing',
            'content:read',
            'content:write',
            'content:delete',
            'content:publish',
        ],
    },
];

async function main() {
    await dataSource.initialize();

    const permissionRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    // ---- permissions ----
    const savedPermissions: Permission[] = [];

    for (const permData of SYSTEM_PERMISSIONS) {
        let permission = await permissionRepo.findOneBy({ key: permData.key });
        if (!permission) {
            permission = permissionRepo.create({
                key: permData.key,
                description: permData.description,
            });
            permission = await permissionRepo.save(permission);
            console.log(`Seeded permission: ${permission.key}`);
        }
        savedPermissions.push(permission);
    }

    // ---- system role templates (organizationId = null) ----
    for (const template of SYSTEM_ROLE_TEMPLATES) {

        let role = await roleRepo.findOneBy({
            roleName: template.roleName,
            organizationId: null as any,
            isSystem: true,
        });

        if (!role) {
            role = roleRepo.create({
                organizationId: null,
                roleName: template.roleName,
                description: template.description,
                isSystem: true,
            });
            role = await roleRepo.save(role);
            console.log(`Seeded system role template: ${role.roleName}`);
        }

        for (const permissionKey of template.permissionKeys) {
            const permission = savedPermissions.find((p) => p.key === permissionKey);
            if (!permission) {
                console.warn(`Permission "${permissionKey}" not found for role "${template.roleName}" - skipping`);
                continue;
            }

            const existingLink = await rolePermissionRepo.findOneBy({
                roleId: role.roleId,
                permissionId: permission.permissionId,
            });

            if (!existingLink) {
                const link = rolePermissionRepo.create({
                    roleId: role.roleId,
                    permissionId: permission.permissionId,
                });
                await rolePermissionRepo.save(link);
                console.log(`Linked ${template.roleName} -> ${permissionKey}`);
            }
        }
    }

    console.log('Organization RBAC seed complete.');
    await dataSource.destroy();
}

main().catch(async (e) => {
    console.error(e);
    await dataSource.destroy();
    process.exit(1);
});