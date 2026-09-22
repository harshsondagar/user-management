import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitesService } from '../service/invites.service';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { JwtGuard } from '../../auth/guard/jwt.guard'; // adjust to your real path
import { currentUser } from '../../common/decorator/current-user.decorator'; // adjust to your real path
import { User } from '../../user/entity/user-entity';

// Deliberately top-level (/invites/accept), not nested under
// /organizations/:organizationId - the token IS how the org gets
// identified, and PermissionGuard doesn't apply here at all: there's no
// membership to check yet, accepting is what CREATES it.
@UseGuards(JwtGuard)
@Controller('invites')
export class AcceptInviteController {
    constructor(private readonly invitesService: InvitesService) { }

    @Post('accept')
    @HttpCode(HttpStatus.OK)
    accept(@currentUser() user: User, @Body() dto: AcceptInviteDto) {
        return this.invitesService.accept(dto.token, user.id, user.email);
    }
}