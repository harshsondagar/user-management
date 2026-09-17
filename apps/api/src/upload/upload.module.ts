import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { IMAGE_PROCESSING_JOB, IMAGE_PROCESSING_QUEUE, MinioService } from '@app/shared';
import { RedisModule } from "@app/shared"
import { BullModule } from '@nestjs/bullmq';


@Module({
    imports: [RedisModule,
        BullModule.registerQueue({
            name: IMAGE_PROCESSING_QUEUE,
        }),],
    controllers: [UploadController],
    providers: [UploadService, MinioService],
})
export class UploadModule { }