import { Module } from '@nestjs/common';
import { HlsController } from './hls.controller';
import { HlsService } from './hls.service';
import { HLS_QUEUE } from './hls.constants';
import { BullModule } from '@nestjs/bullmq';
import { StreamController } from './stream.controller';
import { HlsProcessor } from './hls.processor';
import { JwtModule } from '@nestjs/jwt';
import { KeyController } from './key.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: HLS_QUEUE }),
    JwtModule.register({ secret: process.env.HLS_KEY_SECRET }),
  ],
  controllers: [HlsController, StreamController, KeyController],
  providers: [HlsService, HlsProcessor],
})
export class HlsModule { }