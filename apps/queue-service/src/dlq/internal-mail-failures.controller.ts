// apps/queue-service/src/dlq/internal-mail-failures.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MailFailureService } from '../mail/mail-failure.service';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';

@UseGuards(InternalServiceGuard)
@Controller('internal/mail-failures')
export class InternalMailFailuresController {
    constructor(private readonly mailFailureService: MailFailureService) { }

    @Get()
    async findAll(
        @Query('jobName') jobName?: string,
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '20',
    ) {
        return this.mailFailureService.findAll({ jobName, page: Number(page), pageSize: Number(pageSize) });
    }

    @Get('stats')
    async getStats() {
        return this.mailFailureService.getStats();
    }
}