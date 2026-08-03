import { HttpModule } from "@nestjs/axios";
import { DatagovCatalogService } from "../  datagov-catalog.service";
import { DatagovResourceService } from "../datagov-resource.service";
import { DatagovScraperController } from "./  datagov.controller";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Dataset, DatasetSchema } from "../../schemas/dataset.schema";

@Module({
    imports: [HttpModule, MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }])],
    providers: [DatagovCatalogService, DatagovResourceService],
    controllers: [DatagovScraperController],
    exports: [DatagovCatalogService, DatagovResourceService,],
})
export class DatagovModule { }