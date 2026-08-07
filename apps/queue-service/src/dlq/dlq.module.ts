import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DeadLetterEntry, Dataset, DatasetSchema } from '@app/shared';
import { DlqService } from './dlq.service';
import { DlqRetrySweepService } from './dlq-retry-sweep.service';
import { DatagovModule } from '../data-gov/datagov.module'; // sweep needs DatagovResourceService

@Module({
    imports: [
        TypeOrmModule.forFeature([DeadLetterEntry]),
        MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }]),
        DatagovModule,
    ],
    providers: [DlqService, DlqRetrySweepService],
    exports: [DlqService],
})
export class DlqModule { }