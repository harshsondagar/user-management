// sync.module.ts
import { Module } from '@nestjs/common'
import { SyncController } from './sync.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DatasetSchema } from "@app/shared";
import { Dataset } from "@app/shared";
import { ScrapeQuotaService } from './scrape-quota.service';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { SyncSkip, SyncSkipSchema } from "@app/shared";
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterEntry } from "@app/shared";

@Module({
    imports: [BullModule.registerQueue({
        name: 'scrape-gov-data',
    }), BullBoardModule.forFeature({
        name: 'scrape-gov-data',
        adapter: BullMQAdapter,
    }), MongooseModule.forFeature([
        { name: Dataset.name, schema: DatasetSchema },
        { name: SyncSkip.name, schema: SyncSkipSchema },
    ]), TypeOrmModule.forFeature([DeadLetterEntry])],
    providers: [ScrapeQuotaService, ScrapeProducer],
    controllers: [SyncController],
    exports: []
})
export class SyncModule { }