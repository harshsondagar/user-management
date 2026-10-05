import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { MinioService } from '@app/shared';
import { WsGateway } from './components/ws/ws.gateway';
import { REDIS_CLIENT } from './redis/redis.provider';

const CHAT_READY_CHANNEL = 'chat:message-ready';

interface ImageReadyPayload {
    messageId: string;
    roomId: string;
    status: 'ready';
    thumbKey: string;
    previewKey: string;
    blurhash: string;
    width?: number;
    height?: number;
}

@Injectable()
export class ChatImageReadySubscriber implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ChatImageReadySubscriber.name);
    private subscriber: Redis;

    constructor(
        @Inject(REDIS_CLIENT) private redis: Redis,
        private minio: MinioService,
        private wsGateway: WsGateway,
    ) {
        // A connection in pub/sub subscribe mode can't run other commands
        // (like GET/SET) — ioredis requires a dedicated duplicate connection
        // for subscribing, separate from the one used elsewhere for normal ops.
        this.subscriber = this.redis.duplicate();
    }

    async onModuleInit() {
        await this.subscriber.subscribe(CHAT_READY_CHANNEL);

        this.subscriber.on('message', async (channel, message) => {
            if (channel !== CHAT_READY_CHANNEL) return;

            try {
                const payload: ImageReadyPayload = JSON.parse(message);
                await this.handleImageReady(payload);
            } catch (err) {
                this.logger.error(`Failed to handle image-ready message: ${(err as Error).message}`);
            }
        });

        this.logger.log(`Subscribed to ${CHAT_READY_CHANNEL}`);
    }

    private async handleImageReady(payload: ImageReadyPayload) {
        const bucket = this.minio.getBucket();

        // Generate short-lived signed GET URLs — bucket is private, so raw
        // keys alone aren't fetchable by the client.
        const [thumbUrl, previewUrl] = await Promise.all([
            this.minio.getPresignedGetUrl(payload.thumbKey, 3600),
            this.minio.getPresignedGetUrl(payload.previewKey, 3600),
        ]);

        this.wsGateway.server.to(payload.roomId).emit('image_ready', {
            messageId: payload.messageId,
            status: payload.status,
            thumbUrl,
            previewUrl,
            blurhash: payload.blurhash,
            width: payload.width,
            height: payload.height,
        });

        this.logger.log(`Notified room ${payload.roomId} — message ${payload.messageId} ready`);
    }

    async onModuleDestroy() {
        await this.subscriber.unsubscribe(CHAT_READY_CHANNEL);
        this.subscriber.disconnect();
    }
}