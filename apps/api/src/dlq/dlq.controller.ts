import { Controller, Get, InternalServerErrorException, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorator/roles.decorator';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { DlqService } from './dlq.service';
import { MailFailureService } from './mail-failure.service';
import { DlqStatus, FailureScope, UserRole } from '@app/shared';
import { Public } from '../common/decorator/public-decoretor';

@Controller('dlq')
export class DlqController {
    constructor(
        private readonly dlqService: DlqService,
        private readonly mailFailureService: MailFailureService,
    ) { }

    @Public()
    @Get('entries')
    async getEntries(
        @Query('scope') scope?: FailureScope,
        @Query('status') status?: DlqStatus,
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '20',
    ) {

        return this.dlqService.findEntries({
            scope,
            status,
            page: Number(page),
            pageSize: Math.min(Number(pageSize), 100),
        });
    }

    @Get('entries/:id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getEntryDetail(@Param('id') id: string) {
        throw new InternalServerErrorException("dadad")
        // return this.dlqService.findById(id);
    }

    @Post('entries/:id/resolve')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async resolveEntry(@Param('id') id: string, @currentUser() user: any) {
        return this.dlqService.markResolvedBy(id, user.id);
    }

    @Post('entries/:id/ignore')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async ignoreEntry(@Param('id') id: string) {
        return this.dlqService.markIgnored(id);
    }

    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getStats() {
        return this.dlqService.getStats();
    }

    @Get('mail-failures')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getMailFailures(
        @Query('jobName') jobName?: string,
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '20',
    ) {
        return this.mailFailureService.findAll({
            jobName,
            page: Number(page),
            pageSize: Math.min(Number(pageSize), 100),
        });
    }

    @Get('mail-failures/stats')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getMailFailureStats() {
        return this.mailFailureService.getStats();
    }
}