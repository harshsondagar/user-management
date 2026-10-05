import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { Organization, OrganizationType, OrgStatus } from "../entities/organization-entity"
import { Role } from '../entities/role-entity';
import { RolePermission } from '../entities/role.permission-entity';
import { Member, MemberStatus } from "../entities/members-entity"
import { OrganizationMemberRole } from '../entities/organization.member.role-entity';
import { MemberRepository } from '../repositories/member.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationSubscription } from '../entities/organization-subsciription-entity';
import { Plan, PlanScope } from '../../billing/entities/plan-entity';
import { SubscriptionStatus } from '../../billing/entities/user-subscription-entity';
import { RoleRepository } from '../repositories/role.repository';


@Injectable()
export class OrganizationsService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly organizationRepo: OrganizationRepository,
        private readonly memberRepo: MemberRepository,
        private readonly roleRepo: RoleRepository
    ) { }



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
        const organizationSubscriptionRepo = manager.getRepository(OrganizationSubscription);


        const organization = await orgRepo.save(
            orgRepo.create({
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
                    organizationId: organization.id,
                    roleName: template.roleName,
                    description: template.description,
                    isSystem: false,
                    isDefaultClone: true
                }),
            );

            const templateLinks = await rolePermissionRepo.find({
                where: { roleId: template.roleId },
            });

            for (const link of templateLinks) {
                await rolePermissionRepo.save(
                    rolePermissionRepo.create({
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
                userId: ownerUserId,
                organizationId: organization.id,
                status: MemberStatus.ACTIVE,
                joinedAt: new Date(),
            }),
        );

        const orgFreePlan = await manager.findOne(Plan, { where: { code: 'org_free', scope: PlanScope.ORGANIZATION } });
        if (!orgFreePlan) throw new Error('Organization free plan not seeded — cannot complete organization creation');

        await organizationSubscriptionRepo.save(
            organizationSubscriptionRepo.create({
                organizationId: organization.id,
                planId: orgFreePlan.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: new Date('9999-12-31'),
            })
        )

        await memberRoleRepo.save(
            memberRoleRepo.create({
                memberId: ownerMember.id,
                roleId: adminRoleId,
                assignedByUserId: null,
            }),
        );

        return organization;
    }



    async findAllForUser(userId: string): Promise<Organization[]> {
        const memberships = await this.memberRepo.findAll({
            where: { userId, status: MemberStatus.ACTIVE },
        } as any);
        const organizationIds = memberships.map((m) => m.organizationId);
        if (organizationIds.length === 0) return [];

        return this.organizationRepo.findAll({
            where: { id: In(organizationIds) },
        } as any);
    }


    async findOneForUser(userId: string, organizationId: string): Promise<Organization> {
        const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
        if (!organization) throw new NotFoundException('Organization not found');

        const member = await this.memberRepo.findOne({
            where: { userId, organizationId, status: MemberStatus.ACTIVE },
        });
        if (!member) throw new NotFoundException('Organization not found');

        return organization;
    }


    async update(organizationId: string, organizationName: string): Promise<Organization> {
        const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
        if (!organization) throw new NotFoundException('Organization not found');

        await this.organizationRepo.updateBy({ id: organizationId }, { organizationName });
        return this.organizationRepo.findOne({ where: { id: organizationId } }) as Promise<Organization>;
    }


    async delete(organizationId: string): Promise<void> {
        const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
        if (!organization) throw new NotFoundException('Organization not found');

        if (organization.type === OrganizationType.PERSONAL) {
            throw new BadRequestException(
                'The personal organization cannot be deleted. Delete the account instead.',
            );
        }

        await this.organizationRepo.updateBy({ id: organizationId }, { status: OrgStatus.DELETED });
    }
}
