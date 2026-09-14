import { Module } from '@nestjs/common';
import { ImageProcessingProcessor } from './image-processing.processor';
import { MinioService } from '@app/shared';

@Module({
    providers: [ImageProcessingProcessor, MinioService],
})
export class ImageProcessingModule { }