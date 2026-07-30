import { Injectable, Logger } from '@nestjs/common';
import { ScraperService } from '../scraper/scraper.service';
import { DatagovScraperService } from '../datagov-scraper/datagov-scraper.service';
import { ProgressTrackerService } from './progress-tracker.service';


@Injectable()
export class FullSyncService {
    private readonly logger = new Logger(FullSyncService.name);

    constructor(
        private readonly catalogScraper: ScraperService,
        private readonly resourceClient: DatagovScraperService,
        private readonly progress: ProgressTrackerService,
    ) { }


    async runFullSync(query = '', pageSize = 100) {
        const state = await this.progress.load()
        let offset = state.lastOffset;
        let total = Infinity;

        this.logger.log(`Resuming sync from offset ${offset}`);

        while (offset < total) {
            const { entries, total: catalogTotal } = await this.catalogScraper.searchCatalog(query, offset, pageSize)

            if (typeof catalogTotal !== 'number') {
                this.logger.error(`Got invalid total (${catalogTotal}) at offset ${offset} — stopping.`);
                break;
            }
            total = catalogTotal

            for (const entry of entries) {
                if (state.processedUuids.includes(entry.uuid)) continue;

                try {
                    const resourceIds = await this.resourceClient.lookupResourceIds(entry.nid);

                    if (resourceIds.length === 0) {
                        this.logger.log(`○ No resource IDs: ${entry.title}`);
                        state.processedUuids.push(entry.uuid);
                        await this.sleep(300);
                        continue;
                    }

                    for (const resourceId of resourceIds) {
                        const resourceData = await this.resourceClient.fetchResource({ resourceId, limit: 100 });
                        const records = resourceData.records ?? [];

                        if (records.length > 0) {
                            await this.persist({ ...entry, resourceId }, records);
                            this.logger.log(`✓ Saved ${entry.title} [${resourceId}] (${records.length} records)`);
                        }
                        await this.sleep(300);
                    }

                    state.processedUuids.push(entry.uuid);
                } catch (err: any) {
                    this.logger.warn(`✗ Failed ${entry.uuid} (${entry.title}): ${err.message}`);
                    state.failedUuids.push({ uuid: entry.uuid, error: err.message });
                }

                await this.sleep(300);
            }


            offset += pageSize;
            state.lastOffset = offset;
            await this.progress.save(state);

            this.logger.log(`Progress: ${state.processedUuids.length + state.failedUuids.length}/${total}`);
        }
        this.logger.log(`Sync complete. Success: ${state.processedUuids.length}, Failed: ${state.failedUuids.length}`);
        return state;
    }

    private async persist(entry: any, records: any[]) {
        const fs = await import('fs/promises')
        const path = await import('path')
        const dir = path.join(process.cwd(), 'scraped-data')
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(
            path.join(dir, `${entry.uuid}.json`),
            JSON.stringify({ entry, records }, null, 2)
        )
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}