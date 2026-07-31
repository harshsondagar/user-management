// sync.controller.ts
import { Controller, Post, Query } from '@nestjs/common';
import { FullSyncService } from './full-sync.service';
import { ProgressTrackerService } from './progress-tracker.service';
import { Public } from '../common/decorator/public-decoretor';

@Controller('sync')
export class SyncController {
    constructor(
        private readonly fullSyncService: FullSyncService,
        private readonly progress: ProgressTrackerService,
    ) { }

    @Public()
    @Post('run')
    async run(@Query('q') q = '') {
        console.log(q);

        this.fullSyncService.runFullSync(q).catch((err) => console.error('Sync failed:', err));
        return { message: 'Sync started in background.' };
    }

    @Public()
    @Post('reset')
    async reset() {
        return this.progress.reset();
    }
}