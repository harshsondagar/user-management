// apps/queue-service/src/sync/sync.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FullSyncService } from './full-sync.service';
import { DatagovModule } from '../data-gov/datagov.module'; // ← the new module
import { DlqModule } from '../dlq/dlq.module';  // confirm this exists too
import { Dataset, DatasetSchema, SyncSkip, SyncSkipSchema } from '@app/shared';

@Module({
    imports: [
        DatagovModule,
        DlqModule,
        MongooseModule.forFeature([
            { name: Dataset.name, schema: DatasetSchema },
            { name: SyncSkip.name, schema: SyncSkipSchema },
        ]),
    ],
    providers: [FullSyncService],
    exports: [FullSyncService],
})
export class SyncModule { }