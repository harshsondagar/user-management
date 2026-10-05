import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import sharp from 'sharp';
import { encode } from 'blurhash';
import { MinioService } from '@app/shared';
import Redis from 'ioredis';
import { IMAGE_PROCESSING_QUEUE } from '@app/shared';
import { REDIS_CLIENT } from "@app/shared"

const THUMB_SIZE = 150;
const PREVIEW_MAX_WIDTH = 1080;
const CHAT_READY_CHANNEL = 'chat:message-ready'; // pub/sub channel ws-service subscribes to

@Injectable()
@Processor(IMAGE_PROCESSING_QUEUE, { concurrency: 4 })
export class ImageProcessingProcessor extends WorkerHost {
    private readonly logger = new Logger(ImageProcessingProcessor.name);

    constructor(
        private minio: MinioService,
        @InjectDataSource('roomsDb') private dataSource: DataSource,
        @Inject(REDIS_CLIENT) private redis: Redis,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        const { messageId, roomId, objectKey, mimeType } = job.data;
        this.logger.log(`Processing image for message ${messageId}`);

        // 1. Download original from MinIO
        const buffer = await this.downloadObject(objectKey);

        // 2. Strip EXIF, read dimensions, generate variants
        const image = sharp(buffer).rotate(); // .rotate() with no args auto-orients using EXIF, then strips it
        const metadata = await image.metadata();

        const thumbBuffer = await image
            .clone()
            .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
            .webp({ quality: 60 })
            .toBuffer();

        const previewBuffer = await image
            .clone()
            .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        // 3. Blurhash from a tiny downscale (cheap — do it small)
        const { data, info } = await image
            .clone()
            .resize(32, 32, { fit: 'inside' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);

        // 4. Upload variants back to MinIO
        const baseKey = objectKey.replace('/original/', '/');
        const thumbKey = baseKey.replace(/\.[^.]+$/, '-thumb.webp').replace('original-', 'thumb/');
        const previewKey = baseKey.replace(/\.[^.]+$/, '-preview.webp').replace('original-', 'preview/');
        // Simpler + safer: derive keys from objectKey's room prefix directly
        const roomPrefix = objectKey.split('/original/')[0];
        const filenameNoExt = objectKey.split('/').pop()!.replace(/\.[^.]+$/, '');
        const finalThumbKey = `${roomPrefix}/thumb/${filenameNoExt}.webp`;
        const finalPreviewKey = `${roomPrefix}/preview/${filenameNoExt}.webp`;

        await this.uploadBuffer(finalThumbKey, thumbBuffer, 'image/webp');
        await this.uploadBuffer(finalPreviewKey, previewBuffer, 'image/webp');

        // 5. Update the message row — WITH RETRY, since the batched flush in
        // ws-service might not have written this row to Postgres yet.
        await this.updateMessageWithRetry(messageId, {
            thumbKey: finalThumbKey,
            previewKey: finalPreviewKey,
            blurhash,
            width: metadata.width,
            height: metadata.height,
        });

        await this.redis.publish(
            CHAT_READY_CHANNEL,
            JSON.stringify({
                messageId,
                roomId,
                status: 'ready',
                thumbKey: finalThumbKey,
                previewKey: finalPreviewKey,
                blurhash,
                width: metadata.width,
                height: metadata.height,
            }),
        );

        this.logger.log(`Finished processing message ${messageId}`);

    }

    private async downloadObject(objectKey: string): Promise<Buffer> {
        const stream = await this.minio.getClient().getObject(this.minio.getBucket(), objectKey);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);
        return Buffer.concat(chunks);
    }

    private async uploadBuffer(key: string, buffer: Buffer, mimeType: string): Promise<void> {
        await this.minio.getClient().putObject(this.minio.getBucket(), key, buffer, buffer.length, {
            'Content-Type': mimeType,
        });
    }

    private async updateMessageWithRetry(
        messageId: string,
        variants: { thumbKey: string; previewKey: string; blurhash: string; width?: number; height?: number },
        attempt = 1,
    ): Promise<void> {
        const result = await this.dataSource.query(
            `UPDATE chat_messages
       SET attachment = attachment || $2::jsonb,
           status = 'ready'
       WHERE id = $1`,
            [
                messageId,
                JSON.stringify({
                    thumbKey: variants.thumbKey,
                    previewKey: variants.previewKey,
                    blurhash: variants.blurhash,
                    width: variants.width,
                    height: variants.height,
                }),
            ],
        );

        const rowsAffected = result[1]; // pg driver returns [rows, affectedCount] for raw query
        if (rowsAffected === 0) {
            if (attempt > 10) {
                throw new Error(
                    `Message ${messageId} still not in Postgres after ${attempt} attempts — flush may have failed`,
                );
            }
            // Row not flushed yet — wait and retry. BullMQ will also retry the whole
            // job on throw, but this inner retry avoids re-downloading/re-processing
            // the image just because the flush was slow.
            await new Promise((r) => setTimeout(r, 300));
            return this.updateMessageWithRetry(messageId, variants, attempt + 1);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, err: Error) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`, err.stack);
        // TODO: on final failure, consider updating status to 'failed' so the
        // client stops showing a processing spinner forever.
    }
}