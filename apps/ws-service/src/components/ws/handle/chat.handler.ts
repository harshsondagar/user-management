import { Injectable } from "@nestjs/common";
import { RoomsService } from "../service/room-service";
import { Server, Socket } from "socket.io";
import { ChatDto } from "../dto/chat-dto";


@Injectable()
export class ChatHandler {
    constructor(private readonly rooms: RoomsService) { }

    handle(dto: ChatDto, client: Socket, server: Server) {
        const info = this.rooms.getRoomIdBySocket(client.id);
        if (!info) return client.emit('chat_error', { message: 'Not in a room' });

        const user = this.rooms.getUser(info.roomId, info.userId);

        server.to(info.roomId).emit('chat_message', {
            userId: info.userId,
            username: user?.username,
            message: dto.message,
            ts: Date.now(),
        });
    }
}