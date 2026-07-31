// sync.module.ts
import { Module } from '@nestjs/common';
import { DatagovModule } from '../datagov/fetch data/ datagov.module';
import { FullSyncService } from './full-sync.service';
import { ProgressTrackerService } from './progress-tracker.service';
import { SyncController } from './sync.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DatasetSchema } from '../schemas/dataset.schema';
import { Dataset } from '../schemas/dataset.schema';
@Module({
    imports: [DatagovModule, MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }])],
    providers: [FullSyncService, ProgressTrackerService],
    controllers: [SyncController],
})
export class SyncModule { }