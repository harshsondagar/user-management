import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization-entity';
import { Permission } from './entities/permission-entity';
import { Role } from './entities/role-entity';
import { RolePermission } from './entities/role.permission-entity';
import { Member } from './entities/members-entity';
import { OrganizationMemberRole } from './entities/organization.member.role-entity';
import { OrganizationInvite } from './entities/organization.invite-entity';
import { OrganizationRepository } from './repositories/organization.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { RolePermissionRepository } from './repositories/role.permission.repository';
import { MemberRepository } from './repositories/member.repository';
import { OrganizationMemberRoleRepository } from './repositories/organization.member.role.repositor';
import { OrganizationsService } from './service/organization.service';
import { OrganizationsController } from './controller/organization.controller';
import { MembersController } from './controller/organization-member.controller';
import { RolesController } from './controller/organization-role.controller';
import { InvitesController } from './controller/organization-invite.controller';
import { AcceptInviteController } from './controller/organization-accept-invite.controller';
import { OrganizationAccessService } from './service/organization-access.service';
import { MembersService } from './service/organization-member.service';
import { RolesService } from './service/organization-role.service';
import { InvitesService } from './service/organization-invite.service';
import { PermissionGuard } from './guard/permission.gaurd';
import { OrganizationBillingController } from './controller/organization-billing.contoller';
import { OrganizationEntitlementsService } from './service/organization-entitlement.service';
import { OrganizationSubscription } from './entities/organization-subsciription-entity';
import { OrganizationSubscriptionRepository } from './repositories/organization.org-entitlement.repository';
import { SettlementService } from './service/settlement.service';
import { SettlementRun } from './entities/settlemennt.run-entity';
import { SettlementLine } from './entities/settlement.line-entity';
import { LedgerService } from './service/ledger.service';
import { WatchTrackingService } from './service/organization-watchtracking.service';
import { WatchTrackingController } from './controller/organization-watch.tracking.controller';
import { SettlementCron } from './cron/settlment.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { WatchStat } from './entities/watch-stat-entity';
import { PayoutService } from './service/organization-payout.service';
import { PayoutController } from './controller/organization-payout.controller';
import { OrgEarningsController } from './controller/organization-earning.contoller';
import { AdminSettlementController } from './controller/organization-admin.settlement.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([
            Organization,
            Permission,
            Role,
            RolePermission,
            Member,
            OrganizationMemberRole,
            OrganizationInvite,
            OrganizationSubscription,
            SettlementRun,
            SettlementLine,
            WatchStat
        ]),
    ],
    controllers: [
        OrganizationsController,
        MembersController,
        RolesController,
        InvitesController,
        AcceptInviteController,
        OrganizationBillingController,
        WatchTrackingController,
        PayoutController,
        AdminSettlementController,
        OrgEarningsController
    ],
    providers: [
        OrganizationRepository,
        PermissionRepository,
        RoleRepository,
        RolePermissionRepository,
        MemberRepository,
        OrganizationMemberRoleRepository,
        OrganizationSubscriptionRepository,
        // TODO : OrganizationSeedService on every boot up seed value in db if not exist
        // OrganizationSeedService,
        OrganizationsService,
        OrganizationAccessService,
        MembersService,
        RolesService,
        InvitesService,
        PermissionGuard,
        OrganizationEntitlementsService,
        SettlementService,
        LedgerService,
        WatchTrackingService,
        SettlementCron,
        PayoutService,
        OrgEarningsController,
    ],
    exports: [
        OrganizationsService,
        OrganizationEntitlementsService,
        SettlementService,
        LedgerService,
        WatchTrackingService,
    ],
})
export class OrganizationModule { }
