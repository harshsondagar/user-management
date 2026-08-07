
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatagovCatalogService } from './datagov-catalog.service';
import { DatagovResourceService } from './datagov-resource.service';
import { DatagovDebugController } from './datagov.controller';

@Module({
    imports: [HttpModule],
    controllers: [DatagovDebugController],
    providers: [DatagovCatalogService, DatagovResourceService],
    exports: [DatagovCatalogService, DatagovResourceService],
})
export class DatagovModule { }