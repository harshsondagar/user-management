import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoomService } from "./RoomService";
import { CreateRoomDto } from "./dto/create.room.dto";
import { InviteUserDto } from "./dto/Invite user.dto";
import { BanUserDto } from "./dto/ban.user.dto";
import { CreateInviteLinkDto } from "./dto/creat-invite-link.dto";
import { RoomOwnerGuard } from "./guard/RoomOwnerGuard";

@UseGuards(AuthGuard('jwt'))
@Controller('rooms')
export class RoomController {
    constructor(private readonly roomService: RoomService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateRoomDto) {
        return this.roomService.createRoom(req.user.id, dto);
    }

    @Get()
    listPublic() {
        return this.roomService.listPublicRooms();
    }

    // Registered before ':id' - not that it matters for matching here, since
    // this path has two segments after /rooms and ':id' only matches one,
    // but keeping specific routes above generic dynamic ones is good habit.
    @Get('code/:code')
    getByCode(@Req() req: any, @Param('code') code: string) {
        return this.roomService.getRoomByCodeForUser(code, req.user.id);
    }

    @Get(':id')
    getById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.roomService.getRoomForUser(id, req.user.id);
    }

    @Delete(':id')
    @UseGuards(RoomOwnerGuard)
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.roomService.deleteRoom(id);
    }

    @Post(':id/invites')
    @UseGuards(RoomOwnerGuard)
    invite(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: InviteUserDto) {
        return this.roomService.inviteUser(id, dto.invitedUserId, req.user.id);
    }

    @Delete(':id/invites/:userId')
    @UseGuards(RoomOwnerGuard)
    revokeInvite(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
        return this.roomService.revokeInvite(id, userId);
    }

    @Post(':id/bans')
    @UseGuards(RoomOwnerGuard)
    ban(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BanUserDto) {
        return this.roomService.banUser(id, dto.userId, req.user.id, dto.reason);
    }

    @Delete(':id/bans/:userId')
    @UseGuards(RoomOwnerGuard)
    unban(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
        return this.roomService.unbanUser(id, userId);
    }

    // --- Invite links ---

    @Post(':id/invite-links')
    @UseGuards(RoomOwnerGuard)
    createInviteLink(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInviteLinkDto) {
        return this.roomService.createInviteLink(id, req.user.id, dto);
    }

    @Get(':id/invite-links')
    @UseGuards(RoomOwnerGuard)
    listInviteLinks(@Param('id', ParseUUIDPipe) id: string) {
        return this.roomService.listInviteLinks(id);
    }

    @Delete(':id/invite-links/:linkId')
    @UseGuards(RoomOwnerGuard)
    revokeInviteLink(@Param('id', ParseUUIDPipe) id: string, @Param('linkId', ParseUUIDPipe) linkId: string) {
        return this.roomService.revokeInviteLink(id, linkId);
    }

    // Deliberately NOT behind RoomOwnerGuard - anyone authenticated can
    // redeem a link, that's the entire point. Just needs to be logged in
    // (AuthGuard('jwt') at the class level already covers that).
    @Post('invite-links/:token/redeem')
    redeemInviteLink(@Req() req: any, @Param('token') token: string) {
        return this.roomService.redeemInviteLink(token, req.user.id);
    }
}