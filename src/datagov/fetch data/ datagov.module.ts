import { HttpModule } from "@nestjs/axios";
import { DatagovCatalogService } from "../  datagov-catalog.service";
import { DatagovResourceService } from "../datagov-resource.service";
import { DatagovScraperController } from "./  datagov.controller";
import { Module } from "@nestjs/common";

@Module({
    imports: [HttpModule],
    providers: [DatagovCatalogService, DatagovResourceService],
    controllers: [DatagovScraperController],
    exports: [DatagovCatalogService, DatagovResourceService],
})
export class DatagovModule { }