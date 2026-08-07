import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from "@app/shared";
import { ReportCronService } from '../../../../queue-service/src/cron/report.service';
import { MailModule } from '../../mail/mail.module';
import { BullModule } from '@nestjs/bullmq';
import { MailProducer } from '../../mail/mail-producer';
import { MailFailureService } from '../../dlq/mail-failure.service';
import { MailFailure } from "@app/shared"

@Module({
    imports: [
        TypeOrmModule.forFeature([User, MailFailure]), MailModule,
        BullModule.registerQueue({
            name: 'send-mail'
        })],
    providers: [ReportCronService, MailProducer, MailFailureService],
})
export class CronModule { }
