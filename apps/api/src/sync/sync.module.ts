// sync.module.ts
import { Module } from '@nestjs/common'
import { SyncController } from './sync.controller';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { EntitlementModule } from '../billing/entitlement/entitlement.module';
@Module({
    imports: [BullModule.registerQueue({
        name: 'scrape-gov-data',
    }), BullBoardModule.forFeature({
        name: 'scrape-gov-data',
        adapter: BullMQAdapter,
    }), EntitlementModule],
    providers: [ScrapeProducer],
    controllers: [SyncController],
    exports: []
})
export class SyncModule { }