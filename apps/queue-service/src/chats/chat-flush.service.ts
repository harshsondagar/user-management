import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { DataSource } from "typeorm";
import { ChatMessage, PendingChatMessage } from "@app/shared";
import { InjectDataSource } from "@nestjs/typeorm";

const CHAT_PENDING_KEY = 'chat:pending';
const FLUSH_QUEUE_NAME = 'chat-flush';
const BATCH_SIZE = 200; // upper bound per flush - keeps a single INSERT from getting enormous under a sudden spike
const FLUSH_INTERVAL_MS = 1000;

@Injectable()
export class ChatFlushService implements OnModuleInit {
    private readonly logger = new Logger(ChatFlushService.name);
    private readonly redis: Redis;
    private readonly flushQueue: Queue;
    private worker!: Worker;

    constructor(@InjectDataSource('roomsDb') private readonly dataSource: DataSource) {
        this.redis = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
            maxRetriesPerRequest: null,
        });
        this.flushQueue = new Queue(FLUSH_QUEUE_NAME, { connection: this.redis });
    }

    async onModuleInit() {
        // Schedule the repeatable trigger - this just enqueues an (empty)
        // job every second telling the worker "go check the list now". The
        // actual message payloads live in the Redis LIST, not in this job.
        // BullMQ v5+ moved repeatable jobs from add()'s `repeat` option
        // (removed) to a dedicated Job Scheduler API. upsertJobScheduler is
        // idempotent by schedulerId - safe to call every time the app
        // starts, it won't create duplicate schedules.
        await this.flushQueue.upsertJobScheduler(
            'chat-flush-scheduler',
            { every: FLUSH_INTERVAL_MS },
            {
                name: 'flush',
                data: {},
                opts: {
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            },
        );

        this.worker = new Worker(
            FLUSH_QUEUE_NAME,
            async () => this.flushBatch(),
            { connection: this.redis, concurrency: 1 }, // concurrency 1 is CORRECT here - this isn't per-message work, it's one shared flush task; running two flushes at once would double-process the same peeked range.
        );

        this.worker.on('failed', (job, err) => {
            this.logger.error(`Chat flush failed: ${err.message}`, err.stack);
        });
    }

    private async flushBatch(): Promise<void> {
        // Peek without removing - see the module-level comment in
        // chat-message-entity.ts for why this order (peek -> insert -> trim)
        // matters for crash-safety.
        const raw = await this.redis.lrange(CHAT_PENDING_KEY, 0, BATCH_SIZE - 1);
        if (raw.length === 0) return;

        const messages: PendingChatMessage[] = raw.map((r) => JSON.parse(r));

        const rows = messages.map((m) => ({
            id: m.id,
            roomId: m.roomId,
            userId: m.userId,
            content: m.content,
            sentAt: new Date(m.sentAt),
        }));

        await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(ChatMessage)
            .values(rows)
            // ON CONFLICT DO NOTHING, keyed on the primary key (id). Since
            // ws-service generates that id up front, a retried flush after a
            // crash re-submits the exact same ids - this makes that a safe
            // no-op instead of a duplicate-row error.
            .orIgnore()
            .execute();

        // Only remove the exact range we just (successfully) inserted -
        // if new messages arrived in the meantime, they're further down
        // the list and untouched by this trim.
        await this.redis.ltrim(CHAT_PENDING_KEY, raw.length, -1);
    }
}