import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Dataset, DatasetSchema } from "../db/schemas"
import { DlqService } from './dlq.service';
import { DlqRetrySweepService } from './dlq-retry-sweep.service';
import { DatagovModule } from '../data-gov/datagov.module'; // sweep needs DatagovResourceService
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { DeadLetterEntry } from './entity/dead-letter-entry-entity';
import { MailFailureService } from '../mail/mail-failure.service';
import { InternalMailFailuresController } from './internal-mail-failures.controller';
import { InternalDlqController } from './internal-dlq.controller';
import { MailFailure } from '../mail/entity/mail-failure-entity';

@Module({
    imports: [HttpModule, BullModule.registerQueue({
        name: 'scrape-gov-data',
    }),
        TypeOrmModule.forFeature([DeadLetterEntry, MailFailure]),
        MongooseModule.forFeature([{ name: Dataset.name, schema: DatasetSchema }]),
        DatagovModule,
    ],
    controllers: [InternalDlqController, InternalMailFailuresController],
    providers: [DlqService, MailFailureService, DlqRetrySweepService],
    exports: [DlqService, MailFailureService],
})
export class DlqModule { }