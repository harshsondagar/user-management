import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitesService } from '../service/organization-invite.service';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { currentUser } from '../../common/decorator/currentUser-decorator';
import { User } from '../../user/entity/user-entity';

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