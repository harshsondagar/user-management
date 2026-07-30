import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatagovScraperService } from '../datagov-scraper/datagov-scraper.service';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(private readonly dataGov: DatagovScraperService) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async syncDailyResource() {
        this.logger.log('Starting daily data.gov.in sync');
        const records = await this.dataGov.fetchAllPages('9ef84268-d588-465a-a308-a864a43d0070');
        // persist to DB here (TypeORM/Prisma repository call)
        this.logger.log(`Synced ${records.length} records`);
    }
}