import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class ReceiptStorageService implements OnModuleInit {
    private readonly logger = new Logger(ReceiptStorageService.name);
    private readonly client: Client;
    private readonly bucket: string;

    constructor(config: ConfigService) {
        this.bucket = config.get('MINIO_RECEIPTS_BUCKET', 'receipts');
        this.client = new Client({
            endPoint: config.getOrThrow('MINIO_ENDPOINT'),
            port: Number(config.get('MINIO_PORT', 9000)),
            useSSL: config.get('MINIO_USE_SSL') === 'true',
            accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
            secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
        });
    }

    async onModuleInit() {
        if (!(await this.client.bucketExists(this.bucket))) {
            await this.client.makeBucket(this.bucket);
            this.logger.log(`Created bucket "${this.bucket}"`);
        }
    }

    async upload(key: string, body: Buffer): Promise<string> {
        await this.client.putObject(this.bucket, key, body, body.length, {
            'Content-Type': 'application/pdf',
        });
        return key;
    }

    getStream(key: string): Promise<Readable> {
        return this.client.getObject(this.bucket, key);
    }
}