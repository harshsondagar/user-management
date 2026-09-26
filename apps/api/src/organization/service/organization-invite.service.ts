import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { OrganizationInvite, InviteStatus } from "../entities/organization.invite-entity"
import { MemberRepository } from '../repositories/member.repository';
import { RoleRepository } from '../repositories/role.repository';
import { Member, MemberStatus } from "../entities/members-entity"
import { OrganizationMemberRole } from '../entities/organization.member.role-entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationSubscription } from '../entities/organization-subsciription-entity';
import { OrganizationEntitlementsService } from './organization-entitlement.service';
import { OrganizationRepository } from '../repositories/organization.repository';

const INVITE_EXPIRY_DAYS = 7;
const ORG_MEMBERS_FEATURE_KEY = 'org_members';

@Injectable()
export class InvitesService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly memberRepo: MemberRepository,
        private readonly roleRepo: RoleRepository,
        @InjectRepository(OrganizationSubscription) private readonly organizationSubscriptionRepo: Repository<OrganizationSubscription>,
        private readonly entitlementsService: OrganizationEntitlementsService,
        private readonly organizationRepo: OrganizationRepository
    ) { }


    private hashToken(rawToken: string): string {
        return createHash('sha256').update(rawToken).digest('hex');
    }


    async assertMemberCapacity(
        organizationId: string,
        context: 'invite' | 'accept',
        additionalCount = 1,
    ): Promise<void> {
        const limit = await this.entitlementsService.getEntitlementLimit(organizationId, ORG_MEMBERS_FEATURE_KEY);
        console.log(limit);

        if (limit === null) {
            throw new BadRequestException(
                'This organization has no configured member limit - contact support',
            );
        }

        const org = await this.organizationRepo.findOneById(organizationId);
        const currentCount = await this.entitlementsService.getActiveMemberCount(
            organizationId,
            org.ownerUserId,
        );
        console.log(currentCount);

        if (currentCount + additionalCount > limit) {
            if (context === 'invite') {
                throw new BadRequestException(
                    `This organization has reached its member limit (${limit}). Upgrade your plan to invite more members.`,
                );
            }
            throw new BadRequestException(
                'This organization is currently full and cannot accept new members right now. Please contact the person who invited you.',
            );
        }
    }


    async create(
        organizationId: string,
        invitedByUserId: string,
        email: string,
        roleId: string | undefined,
    ): Promise<{ invite: OrganizationInvite; rawToken: string }> {

        if (roleId) {
            const role = await this.roleRepo.findOne({ where: { roleId, organizationId } });
            if (!role) throw new BadRequestException('Role not found in this organization');
        }


        await this.assertMemberCapacity(organizationId, 'invite');

        const repo = this.dataSource.getRepository(OrganizationInvite);
        const rawToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const invite = await repo.save(
            repo.create({
                organizationId,
                email: email.toLowerCase().trim(),
                roleId: roleId ?? null,
                invitedByUserId,
                tokenHash: this.hashToken(rawToken),
                status: InviteStatus.PENDING,
                expiresAt,
            }),
        );

        return { invite, rawToken };
    }

    async listForOrganization(organizationId: string): Promise<OrganizationInvite[]> {
        const repo = this.dataSource.getRepository(OrganizationInvite);
        return repo.find({
            where: { organizationId, status: InviteStatus.PENDING },
            order: { createdAt: 'DESC' },
        });
    }

    async revoke(organizationId: string, inviteId: string): Promise<void> {
        const repo = this.dataSource.getRepository(OrganizationInvite);
        const invite = await repo.findOne({ where: { id: inviteId, organizationId } });
        if (!invite) throw new NotFoundException('Invite not found');

        await repo.update(invite.id, { status: InviteStatus.REVOKED });
    }


    async accept(rawToken: string, userId: string, userEmail: string): Promise<Member> {
        const repo = this.dataSource.getRepository(OrganizationInvite);
        const tokenHash = this.hashToken(rawToken);

        const invite = await repo.findOne({ where: { tokenHash } });
        if (!invite || invite.status !== InviteStatus.PENDING) {
            throw new BadRequestException('Invite is invalid or has already been used');
        }
        if (invite.expiresAt < new Date()) {
            await repo.update(invite.id, { status: InviteStatus.EXPIRED });
            throw new BadRequestException('Invite has expired');
        }

        if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new BadRequestException('This invite was sent to a different email address');
        }

        let member = await this.memberRepo.findOne({
            where: { userId, organizationId: invite.organizationId },
        });

        const willIncreaseActiveCount = !member || member.status !== MemberStatus.ACTIVE;
        if (willIncreaseActiveCount) {
            await this.assertMemberCapacity(invite.organizationId, 'accept');
        }

        if (member) {
            await this.memberRepo.updateBy(
                { id: member.id },
                { status: MemberStatus.ACTIVE, joinedAt: new Date() },
            );
        } else {
            member = await this.memberRepo.create({
                userId,
                organizationId: invite.organizationId,
                status: MemberStatus.ACTIVE,
                invitedByUserId: invite.invitedByUserId,
                joinedAt: new Date(),
            });
        }

        if (invite.roleId) {
            const memberRoleRepo = this.dataSource.getRepository(OrganizationMemberRole);
            const existingAssignment = await memberRoleRepo.findOne({
                where: { memberId: member.id, roleId: invite.roleId },
            });
            if (!existingAssignment) {
                await memberRoleRepo.save(
                    memberRoleRepo.create({
                        memberId: member.id,
                        roleId: invite.roleId,
                        assignedByUserId: invite.invitedByUserId,
                    }),
                );
            }
        }

        await repo.update(invite.id, { status: InviteStatus.ACCEPTED });

        return member;
    }
}


