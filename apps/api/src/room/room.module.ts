import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Room, RoomBan, RoomInvite, RoomInviteLink } from "@app/shared";
import { RoomController } from "./RoomController";
import { RoomService } from "./RoomService";
import { RoomOwnerGuard } from "./guard/RoomOwnerGuard";
import { RoomRepositories } from "./repositories/room.reposetory";
import { RoomInviteRepositories } from "./repositories/room-invite.reposetory";
import { RoomBanRepositories } from "./repositories/room.ban.reposetory";
import { RoomInviteLinkRepositories } from "./repositories/room-invite-link.repository";

@Module({
    imports: [TypeOrmModule.forFeature([Room, RoomInvite, RoomBan, RoomInviteLink])],
    controllers: [RoomController],
    providers: [
        RoomService,
        RoomOwnerGuard,
        RoomRepositories,
        RoomInviteRepositories,
        RoomBanRepositories,
        RoomInviteLinkRepositories,
    ],
    exports: [RoomService],
})
export class RoomModule { }