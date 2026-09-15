
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatagovCatalogService } from './datagov-catalog.service';
import { DatagovResourceService } from './datagov-resource.service';
import { DatagovDebugController } from './datagov.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [HttpModule, BullModule.registerQueue({
        name: 'scrape-gov-data',
    }),],
    controllers: [DatagovDebugController],
    providers: [DatagovCatalogService, DatagovResourceService],
    exports: [DatagovCatalogService, DatagovResourceService],
})
export class DatagovModule { }