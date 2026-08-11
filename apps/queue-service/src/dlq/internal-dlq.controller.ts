
import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { DlqService } from './dlq.service';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';
import { DlqStatus, FailureScope } from '@app/shared';


@UseGuards(InternalServiceGuard)
@Controller('internal/dlq')
export class InternalDlqController {
    constructor(private readonly dlqService: DlqService) { }

    @Get('entries')
    async findEntries(
        @Query('scope') scope?: string,
        @Query('status') status?: string,
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '20',
    ) {
        return this.dlqService.findEntries({ scope: scope as FailureScope, status: status as DlqStatus, page: Number(page), pageSize: Number(pageSize) });
    }

    @Get('entries/:id')
    async findById(@Param('id') id: string) {
        return this.dlqService.findById(id);
    }

    @Get('stats')
    async getStats() {
        return this.dlqService.getStats();
    }

    @Post('entries/:id/resolve')
    async resolve(@Param('id') id: string, @Query('adminId') adminId: string) {
        return this.dlqService.markResolvedBy(id, adminId);
    }

    @Post('entries/:id/ignore')
    async ignore(@Param('id') id: string) {
        return this.dlqService.markIgnored(id);
    }
}