// sync.controller.ts
import { Controller, HttpException, HttpStatus, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { FullSyncService } from './full-sync.service';
import { Public } from '../common/decorator/public-decoretor';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User, UserRole } from '../user/user-entity';
import { Roles } from '../common/decorator/roles.decorator';
import { ScrapeQuotaService } from './scrape-quota.service';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { ScrapeProducer } from '../scrap-module/scrape.producer';


@Controller('sync')
export class SyncController {
    constructor(
        @Inject(FullSyncService) private readonly fullSyncService: FullSyncService,
        private readonly scrapeQuota: ScrapeQuotaService,
        private readonly scrapeProducer: ScrapeProducer
    ) { }

    @UseGuards(JwtGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER)
    @Post('run')
    async run(@currentUser() user: User, @Query('q') q: string) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

        if (!isAdmin) {
            await this.scrapeQuota.checkAndIncrement(user.id, 2);
            if (!q.trim()) {
                throw new HttpException(
                    'q (dataset name) is required for non-admin users.',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        const job = await this.scrapeProducer.triggerScrape(q, user.id)

        return { jobId: job.id, status: 'queued' };
    }


}