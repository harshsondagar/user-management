import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../user/user-entity';
import { ReportCronService } from './report.service';
import { MailModule } from '../../mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]), MailModule
    ],
    providers: [ReportCronService],
})
export class CronModule { }
