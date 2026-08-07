import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorator/roles.decorator';
import { UserRole } from '@app/shared';
import { Public } from '../common/decorator/public-decoretor';
import { DeadLetterEntry, DlqStatus, FailureScope } from '@app/shared';
import { currentUser } from '../common/decorator/currentUser-decorator';
import type { User } from '@sentry/node';
import { MailFailureService } from './mail-failure.service';

@Controller('dlq')
export class DlqController {
    constructor(
        private readonly dlqService: DlqService,
        private readonly mailFailureService: MailFailureService
    ) { }

    @Get('entries')
    @Roles(UserRole.ADMIN)
    async failedJob(
        @Query('scope') scope?: 'resource' | 'job',
        @Query('status') status?: string,
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '20',
    ) {
        return this.dlqService.findEntries({
            scope: scope as FailureScope | undefined,
            status: status as DlqStatus | undefined,
            page: Number(page),
            pageSize: Math.min(Number(pageSize), 100),
        });
    }

    @Get('entries/:id')
    @Roles(UserRole.ADMIN)
    async getEntryDetail(@Param('id') id: string) {
        return this.dlqService.findById(id);
    }

    @Post('entries/:id/resolve')
    @Roles(UserRole.ADMIN)
    async resolveEntry(@Param('id') id: string, @currentUser() user: User) {
        return this.dlqService.markResolvedBy(id, user.id as string);
    }

    @Post('entries/:id/ignore')
    @Roles(UserRole.ADMIN)
    async ignoreEntry(@Param('id') id: string) {
        return this.dlqService.markIgnored(id);
    }

    @Get('stats')
    @Roles(UserRole.ADMIN)
    async getStats() {
        return this.dlqService.getStats();
    }

    @Public()
    @Post('seed-fake-failure')
    async seedFakeFailure(@Query('count') count = '1') {
        const results: DeadLetterEntry[] = [];
        for (let i = 0; i < Number(count); i++) {
            const fakeId = `fake-${Date.now()}-${i}`;
            const entry = await this.dlqService.recordResourceFailure({
                resourceId: fakeId,
                nid: 900000000 + i,
                title: `Fake Test Dataset ${i}`,
                query: 'test',
                errorMessage: 'Simulated failure: Request failed with status code 429',
                rawContext: { simulated: true, note: 'seeded for testing, not a real data.gov.in failure' },
            });
            results.push(entry);
        }
        return { message: `Seeded ${count} fake DLQ entries`, entries: results };
    }

    @Get('mail-failures')
    @Roles(UserRole.ADMIN)
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
    @Roles(UserRole.ADMIN)
    async getMailFailureStats() {
        return this.mailFailureService.getStats();
    }

}
