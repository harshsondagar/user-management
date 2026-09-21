import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Organization, OrganizationType, OrgStatus } from "./entities/organization-entity"
import { Role } from './entities/role-entity';
import { RolePermission } from './entities/role.permission-entity';
import { Member, MemberStatus } from "./entities/members-entity"
import { OrganizationMemberRole } from './entities/organization.member.role-entity';

@Injectable()
export class OrganizationsService {
    constructor(private readonly dataSource: DataSource) { }

    async createOrganization(
        ownerUserId: string,
        organizationName: string,
        type: OrganizationType,
        manager?: EntityManager,
    ): Promise<Organization> {
        if (manager) {
            return this.createOrganizationWithManager(manager, ownerUserId, organizationName, type);
        }
        return this.dataSource.transaction((txManager) =>
            this.createOrganizationWithManager(txManager, ownerUserId, organizationName, type),
        );
    }

    private async createOrganizationWithManager(
        manager: EntityManager,
        ownerUserId: string,
        organizationName: string,
        type: OrganizationType,
    ): Promise<Organization> {
        const orgRepo = manager.getRepository(Organization);
        const roleRepo = manager.getRepository(Role);
        const rolePermissionRepo = manager.getRepository(RolePermission);
        const memberRepo = manager.getRepository(Member);
        const memberRoleRepo = manager.getRepository(OrganizationMemberRole);

        const organization = await orgRepo.save(
            orgRepo.create({
                id: randomUUID(),
                organizationName,
                type,
                ownerUserId,
                status: OrgStatus.ACTIVE,
            }),
        );

        const systemTemplates = await roleRepo.find({
            where: { organizationId: IsNull(), isSystem: true },
        });

        if (systemTemplates.length === 0) {
            throw new Error(
                'No system role templates found - has OrganizationSeedService run yet?',
            );
        }

        let adminRoleId: string | null = null;

        for (const template of systemTemplates) {
            const clonedRole = await roleRepo.save(
                roleRepo.create({
                    roleId: randomUUID(),
                    organizationId: organization.id,
                    roleName: template.roleName,
                    description: template.description,
                    isSystem: false,
                }),
            );

            const templateLinks = await rolePermissionRepo.find({
                where: { roleId: template.roleId },
            });

            for (const link of templateLinks) {
                await rolePermissionRepo.save(
                    rolePermissionRepo.create({
                        id: randomUUID(),
                        roleId: clonedRole.roleId,
                        permissionId: link.permissionId,
                    }),
                );
            }

            if (template.roleName === 'Org_Admin') {
                adminRoleId = clonedRole.roleId;
            }
        }

        if (!adminRoleId) {
            throw new Error(
                "Org_Admin system role template not found - can't create an org with no admin role",
            );
        }

        const ownerMember = await memberRepo.save(
            memberRepo.create({
                id: randomUUID(),
                userId: ownerUserId,
                organizationId: organization.id,
                status: MemberStatus.ACTIVE,
                joinedAt: new Date(),
            }),
        );

        await memberRoleRepo.save(
            memberRoleRepo.create({
                id: randomUUID(),
                memberId: ownerMember.id,
                roleId: adminRoleId,
                assignedByUserId: null,
            }),
        );

        return organization;
    }
}