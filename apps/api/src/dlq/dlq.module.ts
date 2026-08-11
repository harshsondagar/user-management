import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DlqController } from './dlq.controller';
import { DlqService } from './dlq.service';
import { MailFailureService } from './mail-failure.service';

@Module({
    imports: [HttpModule],
    controllers: [DlqController],
    providers: [DlqService, MailFailureService],
})
export class DlqModule { }