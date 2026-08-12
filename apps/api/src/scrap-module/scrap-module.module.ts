import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
        ScrapeProducer,
    ],

})
export class ScrapModuleModule { }
