import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FullSyncService } from '../sync/full-sync.service';
import { ScrapeProcessor } from './scrape.processor';
import { ScrapeProducer } from './scrape.producer';
import { SyncModule } from '../sync/sync.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'scrape-gov-data'
        }),
        SyncModule
    ],
    providers: [
        ScrapeProcessor,
        ScrapeProducer,
    ],

})
export class ScrapModuleModule { }
