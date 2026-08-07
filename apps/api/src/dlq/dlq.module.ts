// dlq.module.ts (new module, just the entity for now)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterEntry } from '@app/shared';
import { DlqService } from '../../../queue-service/src/dlq/dlq.service';
import { Dataset, DatasetSchema } from "@app/shared";
import { MongooseModule } from '@nestjs/mongoose';
import { DatagovModule } from '../datagov/fetch data/ datagov.module';
import { DlqController } from './dlq.controller';
import { MailFailure } from "@app/shared";
import { MailFailureService } from './mail-failure.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeadLetterEntry, MailFailure]),
        MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }]),
        DatagovModule,
    ],
    providers: [DlqService, MailFailureService],
    exports: [DlqService],
    controllers: [DlqController],

})
export class DlqModule { }