// dlq.module.ts (new module, just the entity for now)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterEntry } from './entity/dead-letter-entry-entity';
import { DlqService } from './dlq.service';
import { Dataset, DatasetSchema } from '../schemas/dataset.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DatagovModule } from '../datagov/fetch data/ datagov.module';
import { DlqRetrySweepService } from './dlq-retry-sweep.service';
import { DlqController } from './dlq.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeadLetterEntry]),
        MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }]),
        DatagovModule,
    ],
    providers: [DlqService, DlqRetrySweepService],
    exports: [DlqService],
    controllers: [DlqController],

})
export class DlqModule { }