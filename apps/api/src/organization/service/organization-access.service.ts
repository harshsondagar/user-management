import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrganizationRepository } from '../repositories/organization.repository';
import { MemberRepository } from '../repositories/member.repository';
import { Member, MemberStatus } from "../entities/members-entity"

export interface OrgMemberAccess {
    member: Member;
    isOwner: boolean;
    permissionKeys: Set<string>;
}

@Injectable()
export class OrganizationAccessService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly organizationRepo: OrganizationRepository,
        private readonly memberRepo: MemberRepository,
    ) { }

    async getMemberAccess(userId: string, organizationId: string): Promise<OrgMemberAccess> {
        const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const member = await this.memberRepo.findOne({
            where: { userId, organizationId, status: MemberStatus.ACTIVE },
        });
        if (!member) {
            throw new NotFoundException('Organization not found');
        }

        const isOwner = organization.ownerUserId === userId;
        const permissionKeys = await this.getPermissionKeysForMember(member.id);

        return { member, isOwner, permissionKeys };
    }

    private async getPermissionKeysForMember(memberId: string): Promise<Set<string>> {
        const rows: Array<{ key: string }> = await this.dataSource
            .createQueryBuilder()
            .select('permission.permission_key', 'key')
            .from('organization_member_roles', 'omr')
            .innerJoin('role_permissions', 'rp', 'rp.role_id = omr.role_id')
            .innerJoin('permissions', 'permission', 'permission.permission_id = rp.permission_id')
            .where('omr.member_id = :memberId', { memberId })
            .getRawMany();
        return new Set(rows.map((r) => r.key));
    }
}