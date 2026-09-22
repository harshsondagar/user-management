import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitesService } from '../service/organization-invite.service';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { RequirePermission } from '../guard/required.permission.decoretor';
import { PermissionGuard } from '../guard/permission.gaurd';
import { PERMISSIONS } from '../seed/organization.seed.service';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { currentUser } from '../../common/decorator/currentUser-decorator';
import { User } from '../../user/entity/user-entity';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('organizations/:organizationId/invites')
export class InvitesController {
    constructor(private readonly invitesService: InvitesService) { }

    @Get()
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    list(@Param('organizationId') organizationId: string) {
        return this.invitesService.listForOrganization(organizationId);
    }

    @Post()
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    async create(
        @currentUser() user: User,
        @Param('organizationId') organizationId: string,
        @Body() dto: InviteMemberDto,
    ) {
        const { invite, rawToken } = await this.invitesService.create(
            organizationId,
            user.id,
            dto.email,
            dto.roleId,
        );
        // TODO: send `rawToken` via email here (your existing
        // mailProducer/OTP-mail pattern) instead of returning it in the
        // response - it's only returned here so this compiles standalone
        // and is testable without wiring the mail job first.
        return { invite, rawToken };
    }

    @Delete(':inviteId')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    @HttpCode(HttpStatus.NO_CONTENT)
    revoke(@Param('organizationId') organizationId: string, @Param('inviteId') inviteId: string) {
        return this.invitesService.revoke(organizationId, inviteId);
    }
}