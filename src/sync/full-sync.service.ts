import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProgressTrackerService } from './progress-tracker.service';
import { CatalogEntry, DatagovCatalogService } from '../datagov/  datagov-catalog.service';
import { DatagovResourceService } from '../datagov/datagov-resource.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Dataset } from '../schemas/dataset.schema';
import { Model } from 'mongoose';
import { log } from 'console';
import { UserRole } from '../user/user-entity';
import { ReadConcern } from 'typeorm';

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


    async runFullSync(requestingRole: UserRole, query = '', pageSize = 100, maxEntries?: number) {
        const isAdmin = requestingRole === UserRole.ADMIN || requestingRole === UserRole.SUPER_ADMIN;

        if (!isAdmin && !query.trim()) {
            throw new HttpException(
                'Please provide a dataset name to search (e.g. ?q=Vahan). Regular users cannot sync the full catalog.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const recordLimit = isAdmin ? 100 : 30;

        const entryCap = isAdmin ? 50 : 1

        const state = await this.progress.load();
        let processedThisRun = 0;

        this.logger.log(`Starting sync. Already processed: ${state.processedNids.length}`);

        for await (const entry of this.catalog.iterateAll(query)) {
            if (state.processedNids.includes(entry.nid)) continue;
            if (entryCap && processedThisRun >= entryCap) {
                this.logger.log(`Reached cap of ${maxEntries}, stopping.`);
                break;
            }

            await this.processEntry(entry, state, recordLimit);
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

    private async processEntry(entry: CatalogEntry, state: Awaited<ReturnType<ProgressTrackerService['load']>>, recordLimit: number) {
        try {

            if (!entry.resourceId) {
                this.logger.log(`○ No resourceId: ${entry.title}`);
                state.processedNids.push(entry.nid);
                return;
            }

            const resourceData = await this.resource.fetchResource({ resourceId: entry.resourceId, limit: recordLimit });
            const records = resourceData.records ?? [];

            if (records.length > 0) {
                await this.persist(entry, entry.resourceId, records);
                this.logger.log(`✓ Saved ${entry.title} [${entry.resourceId}] (${records.length} records)`);
            } else {
                this.logger.log(`○ 0 records: ${entry.title} [${entry.resourceId}]`);
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