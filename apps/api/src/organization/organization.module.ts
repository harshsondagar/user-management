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
// import { OrganizationSeedService } from 
import { OrganizationsService } from './organization.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Organization,
            Permission,
            Role,
            RolePermission,
            Member,
            OrganizationMemberRole,
            OrganizationInvite,
        ]),
    ],
    providers: [
        OrganizationRepository,
        PermissionRepository,
        RoleRepository,
        RolePermissionRepository,
        MemberRepository,
        OrganizationMemberRoleRepository,
        // OrganizationSeedService,
        OrganizationsService,
    ],
    exports: [OrganizationsService],
})
export class OrganizationModule { }