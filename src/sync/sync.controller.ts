import { Controller, Post, Query } from '@nestjs/common';
import { FullSyncService } from './full-sync.service';
import { Public } from '../common/decorator/public-decoretor';

@Controller('sync')
export class SyncController {
    constructor(private readonly fullSyncService: FullSyncService) { }

    @Public()
    @Post('run')
    async run(@Query('q') q = '') {
        this.fullSyncService.runFullSync(q).catch((err) => console.error('Sync failed:', err));
        return { message: 'Sync started in background. Check logs and scraped-data/ folder for progress.' };
    }

}