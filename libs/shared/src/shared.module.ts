import 'dotenv/config';
import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule } from '@nestjs/config';
import minioConfig from './minio/minio.config';
import { MinioModule } from './minio/minio.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [minioConfig],
  }),
    MinioModule,
    RedisModule
  ],
  providers: [SharedService],
  exports: [SharedService, MinioModule],
})
export class SharedModule { }