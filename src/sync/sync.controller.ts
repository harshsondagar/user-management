// sync.controller.ts
import { Controller, HttpException, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { FullSyncService } from './full-sync.service';
import { ProgressTrackerService } from './progress-tracker.service';
import { Public } from '../common/decorator/public-decoretor';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User, UserRole } from '../user/user-entity';
import { Roles } from '../common/decorator/roles.decorator';
import { ScrapeQuotaService } from './scrape-quota.service';
import { JwtGuard } from '../auth/gurads/jwt.guard';


@Controller('sync')
export class SyncController {
    constructor(
        private readonly fullSyncService: FullSyncService,
        private readonly progress: ProgressTrackerService,
        private readonly scrapeQuota: ScrapeQuotaService,
    ) { }

    @UseGuards(JwtGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER)
    @Post('run')
    async run(@currentUser() user: User, @Query('q') q = '') {
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

        this.fullSyncService.runFullSync(user.role, q).catch((err) => console.error('Sync failed:', err));
        return { message: isAdmin ? 'Full sync started.' : `Sync started for "${q}".` };
    }

    @UseGuards(JwtGuard)
    @Post('reset')
    @Roles(UserRole.ADMIN)
    async reset() {
        return this.progress.reset();
    }
}