import { Injectable } from "@nestjs/common";
import { RoomsService } from "../service/room-service";
import { Server, Socket } from "socket.io";
import { ChatDto } from "../dto/chat-dto";
import { ChatPersistenceQueue } from "../chats/chat-persistence-queue";
import { randomUUID } from "crypto";


@Injectable()
export class ChatHandler {
    constructor(
        private readonly rooms: RoomsService,
        private readonly chatQueue: ChatPersistenceQueue
    ) { }

    handle(dto: ChatDto, client: Socket, server: Server) {

        const info = this.rooms.getRoomIdBySocket(client.id);
        if (!info) return client.emit('chat_error', { message: 'Not in a room' });

        const id = randomUUID();
        const sentAt = new Date();
        const user = this.rooms.getUser(info.roomId, info.userId);

        server.to(info.roomId).emit('chat_message', {
            userId: info.userId,
            username: user?.username,
            message: dto.message,
            ts: Date.now(),
        });
        console.log("came here");


        this.chatQueue.enqueue(id, info.roomId, info.userId, dto.message, sentAt);
    }
}