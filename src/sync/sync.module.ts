import { Module } from '@nestjs/common';
import { DatagovScraperModule } from '../datagov-scraper/datagov-scraper.module';
import { ProgressTrackerService } from './progress-tracker.service';
import { FullSyncService } from './full-sync.service';
import { SyncController } from './sync.controller';
import { ScraperService } from '../scraper/scraper.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
    imports: [DatagovScraperModule, DatagovScraperModule, HttpModule],
    providers: [FullSyncService, ProgressTrackerService, ScraperService],
    controllers: [SyncController],
})
export class SyncModule { }
