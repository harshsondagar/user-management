import { HttpModule } from "@nestjs/axios";
import { DatagovScraperController } from "./  datagov.controller";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Dataset, DatasetSchema } from "@app/shared"


@Module({
    imports: [HttpModule, MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }])],
    providers: [],
    controllers: [DatagovScraperController],
    exports: [],
})
export class DatagovModule { }