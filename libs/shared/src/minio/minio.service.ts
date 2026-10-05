import "dotenv/config"
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private client: Minio.Client;
    private bucket: string;

    constructor(private config: ConfigService) {
        this.client = new Minio.Client({
            endPoint: "localhost",
            port: this.config.get('minio.port'),
            useSSL: this.config.get('minio.useSSL'),
            accessKey: this.config.get('minio.accessKey'),
            secretKey: this.config.get('minio.secretKey'),
        });
        this.bucket = this.config.get('minio.bucket')!;
        this.logger.log(this.config.get('minio.bucket')!)
    }

    async onModuleInit() {
        const exists = await this.client.bucketExists(this.bucket).catch((err) => console.log("error", (err as Error).message));

        if (!exists) {
            await this.client.makeBucket(this.bucket, 'us-east-1');
            this.logger.log(`Created bucket "${this.bucket}"`);
        }
    }

    getClient() {
        return this.client;
    }

    getBucket() {
        return this.bucket;
    }

    async getPresignedPutUrl(
        objectKey: string,
        expirySeconds: number,
    ): Promise<string> {

        console.log(expirySeconds);

        return this.client.presignedPutObject(this.bucket, objectKey, expirySeconds);
    }

    async getPresignedGetUrl(
        objectKey: string,
        expirySeconds = 3600,
    ): Promise<string> {
        return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
    }

    async statObject(objectKey: string) {
        return this.client.statObject(this.bucket, objectKey);
    }

    async removeObject(objectKey: string) {
        return this.client.removeObject(this.bucket, objectKey);
    }
}