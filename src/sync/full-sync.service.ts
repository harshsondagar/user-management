import { Injectable, Logger } from '@nestjs/common';
import { ProgressTrackerService } from './progress-tracker.service';
import { CatalogEntry, DatagovCatalogService } from '../datagov/  datagov-catalog.service';
import { DatagovResourceService } from '../datagov/datagov-resource.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Dataset } from '../schemas/dataset.schema';
import { Model } from 'mongoose';

@Injectable()
export class FullSyncService {
    private readonly logger = new Logger(FullSyncService.name);
    private readonly outputDir = path.join(process.cwd(), 'scraped-data');


    constructor(
        private readonly catalog: DatagovCatalogService,
        private readonly resource: DatagovResourceService,
        private readonly progress: ProgressTrackerService,
        @InjectModel(Dataset.name) private readonly datasetModel: Model<Dataset>,
    ) { }


    async runFullSync(query = '', pageSize = 100) {

        console.log(query);

        const state = await this.progress.load();
        let processedThisRun = 0;
        let savedThisRun = 0;


        this.logger.log(`Starting sync. Already processed: ${state.processedNids.length}`);

        for await (const entry of this.catalog.iterateAll(query)) {
            if (state.processedNids.includes(entry.nid)) continue;

            await this.processEntry(entry, state);
            processedThisRun++;

            if (processedThisRun % 25 === 0) {
                await this.progress.save(state); // checkpoint periodically, not every single entry
                this.logger.log(
                    `Checkpoint: ${state.processedNids.length} processed, ${state.failedNids.length} failed`,
                );
            }
        }

        await this.progress.save(state);
        this.logger.log(
            `Sync complete. Processed: ${state.processedNids.length}, Failed: ${state.failedNids.length}`,
        );
        return state;
    }

    private async processEntry(entry: CatalogEntry, state: Awaited<ReturnType<ProgressTrackerService['load']>>) {
        try {
            const resourceIds = await this.resource.lookupResourceIds(entry.nid);

            if (resourceIds.length === 0) {
                this.logger.log(`○ No resource IDs: ${entry.title}`);
                return;
            }

            for (const resourceId of resourceIds) {
                const resourceData = await this.resource.fetchResource({ resourceId, limit: 100 });
                const records = resourceData.records ?? [];
                console.log(records);

                if (records.length > 0) {
                    await this.persist(entry, resourceId, records);
                    this.logger.log(`✓ Saved ${entry.title} [${resourceId}] (${records.length} records)`);
                } else {
                    this.logger.log(`○ 0 records: ${entry.title} [${resourceId}]`);
                }

                await this.sleep(300);
            }

            state.processedNids.push(entry.nid);
        } catch (err: any) {
            this.logger.warn(`✗ Failed ${entry.nid} (${entry.title}): ${err.message}`);
            state.failedNids.push({ nid: entry.nid, error: err.message });
        } finally {
            await this.sleep(300);
        }
    }

    private async persist(entry: any, resourceId: string, records: any[]) {
        await this.datasetModel.updateOne(
            { resourceId },
            {
                $set: {
                    nid: entry.nid,
                    resourceId,
                    title: entry.title,
                    ministry: entry.ministry,
                    sector: entry.sector,
                    jurisdiction: entry.jurisdiction,
                    govtType: entry.govtType,
                    url: entry.url,
                    keywords: entry.keywords,
                    records,
                    recordCount: records.length,
                    fetchedAt: new Date(),
                }
            }, { upsert: true },
        )
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}