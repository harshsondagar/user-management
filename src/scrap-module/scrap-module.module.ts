import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FullSyncService } from '../sync/full-sync.service';
import { ScrapeProcessor } from './scrape.processor';
import { ScrapeProducer } from './scrape.producer';
import { SyncModule } from '../sync/sync.module';
import { DlqService } from '../dlq/dlq.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterEntry } from '../dlq/entity/dead-letter-entry-entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeadLetterEntry]),
        BullModule.registerQueue({
            name: 'scrape-gov-data'
        }),
        SyncModule
    ],
    providers: [
        ScrapeProcessor,
        ScrapeProducer,
        DlqService
    ],

})
export class ScrapModuleModule { }
