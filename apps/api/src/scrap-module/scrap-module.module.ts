import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FullSyncService } from '../../../queue-service/src/sync/full-sync.service';
import { ScrapeProcessor } from '../../../queue-service/src/processors/scrape.processor';
import { ScrapeProducer } from './scrape.producer';
import { SyncModule } from '../sync/sync.module';
import { DlqService } from '../../../queue-service/src/dlq/dlq.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterEntry } from '@app/shared';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeadLetterEntry]),
        BullModule.registerQueue({
            name: 'scrape-gov-data'
        }),
        SyncModule
    ],
    providers: [
        ScrapeProducer,
        DlqService
    ],

})
export class ScrapModuleModule { }
