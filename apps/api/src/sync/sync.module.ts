// sync.module.ts
import { Module } from '@nestjs/common'
import { SyncController } from './sync.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ScrapeQuotaService } from './scrape-quota.service';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
    imports: [BullModule.registerQueue({
        name: 'scrape-gov-data',
    }), BullBoardModule.forFeature({
        name: 'scrape-gov-data',
        adapter: BullMQAdapter,
    })],
    providers: [ScrapeQuotaService, ScrapeProducer],
    controllers: [SyncController],
    exports: []
})
export class SyncModule { }