import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { RoomService } from "../RoomService";
import { Request } from "express";

@Injectable()
export class RoomOwnerGuard implements CanActivate {
    constructor(private readonly roomService: RoomService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const userId: string | undefined = req.user?.id;
        const rawRoomId = req.params?.id;
        const roomId: string | undefined = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;


        if (!userId) throw new UnauthorizedException();
        if (!roomId) throw new ForbiddenException('Room id missing from request');

        const room = await this.roomService.findRoomOrThrow(roomId);
        if (room.ownerId !== userId) {
            throw new ForbiddenException('Only the room owner can do this');
        }

        // Stash it on the request so downstream handlers don't need to
        // re-fetch the same row a second time.
        req.room = room;
        return true;
    }
}