import { Injectable, ForbiddenException, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { MinioService } from '@app/shared';
import { IMAGE_PROCESSING_QUEUE, IMAGE_PROCESSING_JOB } from '@app/shared';
import { PendingChatMessage, ChatAttachment, ChatMessageType, ChatMessageStatus } from '@app/shared';
import { PresignUploadDto } from './dto/presign-upload.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@app/shared';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { DataSource } from 'typeorm';

const EXT_MAP: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

const CHAT_PENDING_KEY = 'chat:pending'; // must match ws-service's constant exactly

@Injectable()
export class UploadService {
    constructor(
        private minio: MinioService,
        private config: ConfigService,
        private readonly dataSource: DataSource,
        @Inject(REDIS_CLIENT) private redisService: Redis,
        @InjectQueue(IMAGE_PROCESSING_QUEUE) private imageQueue: Queue,
    ) { }

    async createPresignedUpload(userId: string, dto: PresignUploadDto) {
        const ext = EXT_MAP[dto.mimeType];
        const objectKey = `${dto.roomId}/original/${uuidv4()}.${ext}`;
        const rawExpiry = this.config.get<number>('minio.presignExpirySeconds');
        const expiry = Number(rawExpiry || 3600);

        const uploadUrl = await this.minio.getPresignedPutUrl(objectKey, expiry!);
        return { uploadUrl, objectKey, expiresIn: expiry };
    }

    async confirmUpload(userId: string, dto: ConfirmUploadDto) {
        let stat;
        try {
            stat = await this.minio.statObject(dto.objectKey);
        } catch {
            throw new BadRequestException('Object not found in storage — upload may have failed');
        }

        if (!dto.objectKey.startsWith(`${dto.roomId}/`)) {
            throw new ForbiddenException('Object key does not belong to this room');
        }

        const messageId = uuidv4();

        const attachment: ChatAttachment = {
            bucket: this.minio.getBucket(),
            originalKey: dto.objectKey,
            size: stat.size,
            mimeType: dto.mimeType,
        };

        const pending: PendingChatMessage = {
            id: messageId,
            roomId: dto.roomId,
            userId,
            content: dto.caption ?? null,
            type: ChatMessageType.IMAGE,
            status: ChatMessageStatus.PROCESSING,
            attachment,
            sentAt: new Date().toISOString(),
        };

        await this.redisService.rpush(CHAT_PENDING_KEY, JSON.stringify(pending));

        await this.imageQueue.add(IMAGE_PROCESSING_JOB, {
            messageId,
            roomId: dto.roomId,
            objectKey: dto.objectKey,
            bucket: this.minio.getBucket(),
            mimeType: dto.mimeType,
        });

        return { messageId, status: 'processing' };
    }

    async getOriginalUrl(userId: string, messageId: string) {
        const row = await this.dataSource.query(
            `SELECT "roomId", attachment->>'originalKey' AS "originalKey", attachment->>'bucket' AS bucket
     FROM chat_messages WHERE id = $1`,
            [messageId],
        );

        if (!row.length || !row[0].originalKey) {
            throw new NotFoundException('Message or original image not found');
        }

        // TODO: verify userId is actually a member of row[0].roomId before
        // handing out a signed URL — same membership check we deferred earlier.

        const url = await this.minio.getPresignedGetUrl(row[0].originalKey, 300); // 5 min, just for this view
        return { url };
    }
}