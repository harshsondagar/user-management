import { dataSource } from "../../config/data-source";
import { Member } from "../entities/members-entity";
import { OrganizationMemberRole } from "../entities/organization.member.role-entity";
import { Permission } from "../entities/permission-entity";
import { Role } from "../entities/role-entity";


export const SYSTEM_PERMISSIONS = [
    { key: 'content:read', description: 'Can view content,posts and pages' },
    { key: 'content:write', description: 'Can create and edit draft content posts' },
    { key: 'content:delete', description: 'Can permanently delete content' },
    { key: 'content:publish', description: 'Can make blog posts public live' },
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
];


async function main() {
    await dataSource.initialize();

    const permissionRepo = dataSource.getRepository(Permission);
    const RolePermissionRepo = dataSource.getRepository(Role);
    const memberRepo = dataSource.getRepository(Member);
    const orgMemberRoleRepo = dataSource.getRepository(OrganizationMemberRole);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const savedPermissions: Permission[] = [];

    for (const permData of SYSTEM_PERMISSIONS) {
        let permission = await permissionRepo.findOneBy({ key: permData.key });
        if (!permission) {
            permission = permissionRepo.create({
                key: permData.key,
                description: permData.description,
            });
            permission = await permissionRepo.save(permission);
        }
        savedPermissions.push(permission);
    }

}

main().catch(e => {
    console.log(e);

})