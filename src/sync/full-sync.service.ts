import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CatalogEntry, DatagovCatalogService } from '../datagov/  datagov-catalog.service';
import { DatagovResourceService } from '../datagov/datagov-resource.service';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Dataset } from '../schemas/dataset.schema';
import { Model } from 'mongoose';
import { Job } from 'bullmq';

@Injectable()
export class FullSyncService {
    private readonly logger = new Logger(FullSyncService.name);
    private readonly outputDir = path.join(process.cwd(), 'scraped-data');


    constructor(
        private readonly catalog: DatagovCatalogService,
        private readonly resource: DatagovResourceService,
        @InjectModel(Dataset.name) private readonly datasetModel: Model<Dataset>,
    ) { }


    async runFullSync(query = '', job: Job, maxEntries = 100) {

        let processedThisRun = 0;
        let nids = 0


        this.logger.log(`Starting sync. Already processed: ${nids === 0 ? null : nids}`);

        for await (const entry of this.catalog.iterateAll(query)) {


            // if (state.processedNids.includes(entry.nid)) continue;
            nids++

            if (maxEntries && processedThisRun >= maxEntries) {
                this.logger.log(`Reached cap of ${maxEntries}, stopping.`);
                break;
            }

            await this.processEntry(entry);
            processedThisRun++;


            if (job) {
                await job.updateProgress({
                    processed: processedThisRun,
                    succeeded: nids,
                    failed: 0,
                });
            }

        }

        this.logger.log(
            `Sync complete. Processed: ${nids},`,
        );
    }

    private async processEntry(entry: CatalogEntry) {
        try {

            if (!entry.resourceId) {
                this.logger.log(`○ No resourceId: ${entry.title}`);
                return;
            }
            console.log(entry.resourceId);

            const resourceData = await this.resource.fetchResource({ resourceId: entry.resourceId });
            const records = resourceData.records ?? [];

            if (records.length > 0) {
                await this.persist(entry, entry.resourceId, records);
                this.logger.log(`✓ Saved ${entry.title} [${entry.resourceId}] (${records.length} records)`);
            } else {
                this.logger.log(`○ 0 records: ${entry.title} [${entry.resourceId}]`);
            }

        } catch (err: any) {
            this.logger.warn(`✗ Failed ${entry.nid} (${entry.title}): ${err.message}`);
        } finally {
            await this.sleep(300);
        }
    }

    private async persist(entry: any, resourceId: string, records: any[]) {


        const existingResource = await this.datasetModel.findOne({ resourceId: entry.resourceId })

        if (existingResource) {
            console.log(existingResource.resourceId);
            this.logger.warn("already process resourceid", entry.resourceId)
        }

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