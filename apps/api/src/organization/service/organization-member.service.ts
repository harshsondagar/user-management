import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRepository } from '../repositories/member.repository';
import { OrganizationMemberRoleRepository } from '../repositories/organization.member.role.repositor';
import { OrganizationRepository } from '../repositories/organization.repository';
import { RoleRepository } from '../repositories/role.repository';
import { Member, MemberStatus } from "../entities/members-entity"

@Injectable()
export class MembersService {
    constructor(
        private readonly memberRepo: MemberRepository,
        private readonly memberRoleRepo: OrganizationMemberRoleRepository,
        private readonly organizationRepo: OrganizationRepository,
        private readonly roleRepo: RoleRepository,
    ) { }

    async listForOrganization(organizationId: string): Promise<Member[]> {
        return this.memberRepo.findAll({
            where: { organizationId, status: MemberStatus.ACTIVE },
        } as any);
    }

    async remove(organizationId: string, memberId: string): Promise<void> {

        const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
        if (!organization) throw new NotFoundException('Organization not found');

        const member = await this.memberRepo.findOne({ where: { id: memberId, organizationId } });
        if (!member) throw new NotFoundException('Member not found');

        if (member.userId === organization.ownerUserId) {
            throw new BadRequestException('The organization owner cannot be removed');
        }

        // Status flip, not a hard delete - preserves who was a member and
        // when, same reasoning as Organization's soft-delete-via-status.
        await this.memberRepo.updateBy({ id: memberId }, { status: MemberStatus.REMOVED });
    }

    async assignRole(
        organizationId: string,
        memberId: string,
        roleId: string,
        assignedByUserId: string,
    ): Promise<void> {
        const member = await this.memberRepo.findOne({ where: { id: memberId, organizationId } });
        if (!member) throw new NotFoundException('Member not found');

        const role = await this.roleRepo.findOne({ where: { roleId, organizationId } });
        if (!role) throw new NotFoundException('Role not found in this organization');

        const existing = await this.memberRoleRepo.findOne({ where: { memberId, roleId } });
        if (existing) return; // already assigned - idempotent, not an error

        await this.memberRoleRepo.create({ memberId, roleId, assignedByUserId });
    }

    async unassignRole(organizationId: string, memberId: string, roleId: string): Promise<void> {
        const member = await this.memberRepo.findOne({ where: { id: memberId, organizationId } });
        if (!member) throw new NotFoundException('Member not found');

        await this.memberRoleRepo.deleteBy({ memberId, roleId });
    }
}