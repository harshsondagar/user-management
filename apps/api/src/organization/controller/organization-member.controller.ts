import { Controller, Get, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RequirePermission } from '../guard/required.permission.decoretor';
import { PermissionGuard } from '../guard/permission.gaurd';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { currentUser } from '../../common/decorator/currentUser-decorator';
import { User } from '../../user/entity/user-entity';
import { PERMISSIONS } from '../service/constant';
import { MembersService } from '../service/organization-member.service';
import { AssignRoleDto } from '../dto/assign-role.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('organizations/:organizationId/members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get()
    list(@Param('organizationId') organizationId: string) {
        return this.membersService.listForOrganization(organizationId);
    }

    @Delete(':memberId')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @Param('organizationId') organizationId: string,
        @Param('memberId') memberId: string,
    ) {
        return this.membersService.remove(organizationId, memberId);
    }

    @Put(':memberId/roles')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_ROLES)
    @HttpCode(HttpStatus.NO_CONTENT)
    assignRole(
        @currentUser() user: User,
        @Param('organizationId') organizationId: string,
        @Param('memberId') memberId: string,
        @Body() dto: AssignRoleDto,
    ) {
        return this.membersService.assignRole(organizationId, memberId, dto.roleId, user.id);
    }

    @Delete(':memberId/roles/:roleId')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_ROLES)
    @HttpCode(HttpStatus.NO_CONTENT)
    unassignRole(
        @Param('organizationId') organizationId: string,
        @Param('memberId') memberId: string,
        @Param('roleId') roleId: string,
    ) {
        return this.membersService.unassignRole(organizationId, memberId, roleId);
    }
}