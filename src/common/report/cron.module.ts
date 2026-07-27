import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../user/user-entity';
import { ReportCronService } from './report.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
    ],
    providers: [ReportCronService],
})
export class CronModule { }
