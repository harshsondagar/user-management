import { Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { PendingChatMessage } from "@app/shared";

const CHAT_PENDING_KEY = 'chat:pending';

@Injectable()
export class ChatPersistenceQueue {
    private readonly redis = new Redis({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
    });

    // id/sentAt are supplied by the caller (ChatHandler) now, not generated
    // in here - that way the SAME id that goes out in the live broadcast is
    // the one that ends up in Postgres, so a client can dedupe a message it
    // already rendered live against the same message coming back from
    // chat-history later, instead of showing it twice.
    async enqueue(id: string, roomId: string, userId: string, content: string, sentAt: Date): Promise<void> {
        const message: PendingChatMessage = {
            id,
            roomId,
            userId,
            content,
            sentAt: sentAt.toISOString(),
        };

        try {
            await this.redis.rpush(CHAT_PENDING_KEY, JSON.stringify(message));
        } catch (err) {
            console.error('Failed to enqueue chat message for persistence', err);
        }
    }
}