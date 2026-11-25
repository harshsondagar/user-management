import { Module } from '@nestjs/common';
import { HlsController } from './hls.controller';
import { HlsService } from './hls.service';
import { HLS_QUEUE } from './hls.constants';
import { BullModule } from '@nestjs/bullmq';
import { StreamController } from './stream.controller';
import { HlsProcessor } from './hls.processor';

@Module({
  imports: [BullModule.registerQueue({ name: HLS_QUEUE })],
  controllers: [HlsController, StreamController],
  providers: [HlsService, HlsProcessor],   // <- must be here
})
export class HlsModule { }