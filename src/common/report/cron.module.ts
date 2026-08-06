import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../user/user-entity';
import { ReportCronService } from './report.service';
import { MailModule } from '../../mail/mail.module';
import { BullModule } from '@nestjs/bullmq';
import { MailProducer } from '../../mail/mail-producer';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]), MailModule,
        BullModule.registerQueue({
            name: 'send-mail'
        })],
    providers: [ReportCronService, MailProducer],
})
export class CronModule { }
