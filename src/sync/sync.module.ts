// sync.module.ts
import { Module } from '@nestjs/common';
import { DatagovModule } from '../datagov/fetch data/ datagov.module';
import { FullSyncService } from './full-sync.service';
import { SyncController } from './sync.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DatasetSchema } from '../schemas/dataset.schema';
import { Dataset } from '../schemas/dataset.schema';
import { ScrapeQuotaService } from './scrape-quota.service';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"


@Module({
    imports: [DatagovModule, BullModule.registerQueue({
        name: 'scrape-gov-data',
    }), BullBoardModule.forFeature({
        name: 'scrape-gov-data', // same name — this is what actually makes it show up on the dashboard
        adapter: BullMQAdapter,
    }), MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }])],
    providers: [FullSyncService, ScrapeQuotaService, ScrapeProducer],
    controllers: [SyncController],
    exports: [FullSyncService]
})
export class SyncModule { }