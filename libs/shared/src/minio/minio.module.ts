import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import minioConfig from './minio.config';
import { MinioService } from './minio.service';

@Global()
@Module({
    imports: [ConfigModule.forFeature(minioConfig)],
    providers: [MinioService],
    exports: [MinioService],
})
export class MinioModule { }