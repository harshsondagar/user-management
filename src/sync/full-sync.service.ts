import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CatalogEntry, DatagovCatalogService } from '../datagov/  datagov-catalog.service';
import { DatagovResourceService } from '../datagov/datagov-resource.service';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Dataset } from '../schemas/dataset.schema';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { SyncSkip } from '../schemas/sync.schema';
import { SyncFailure } from '../schemas/sync-failer.schema';

@Injectable()
export class FullSyncService {
    private readonly logger = new Logger(FullSyncService.name);
    private readonly outputDir = path.join(process.cwd(), 'scraped-data');

    constructor(
        private readonly catalog: DatagovCatalogService,
        private readonly resource: DatagovResourceService,
        @InjectModel(Dataset.name) private readonly datasetModel: Model<Dataset>,
        @InjectModel(SyncSkip.name) private readonly syncSkipModel: Model<SyncSkip>,
        @InjectModel(SyncFailure.name) private readonly syncFailureModel: Model<SyncFailure>
    ) { }


    async runFullSync(query = '', job: Job, maxEntries = 100) {

        let processedThisRun = 0;
        let succeededThisRun = 0
        let failedThisRun = 0

        const alreadyProcessed = await this.totalNidProcessed();
        const alreadyFailed = await this.totalSkipped();

        this.logger.log(`Starting sync. Already processed: ${alreadyProcessed}, already failed: ${alreadyFailed}`);

        for await (const entry of this.catalog.iterateAll(query)) {
            try {

                if (await this.isAlreadyProcessed(entry.nid)) {
                    continue
                };

                if (maxEntries && processedThisRun >= maxEntries) {
                    this.logger.log(`Reached cap of ${maxEntries}, stopping.`);
                    break;
                }

                const succeeded = await this.processEntry(entry);
                processedThisRun++;

                succeeded ? succeededThisRun++ : failedThisRun++;

                if (job) {
                    await job.updateProgress({
                        processed: processedThisRun,
                        succeededThisRun,
                        failedThisRun,
                        totalSucceededAllTime: alreadyProcessed + succeededThisRun,
                        totalSkippedAllTime: await this.totalSkipped(),
                        totalFailedAllTime: await this.totalFailed(),
                    });
                }

            } catch (loopErr: any) {
                this.logger.error(`Unexpected error processing entry ${entry.nid}: ${loopErr.message}`);
            }

        }

        const finalSucceeded = await this.totalNidProcessed();
        const finalFailed = await this.totalFailed();
        const finalSkipped = await this.totalSkipped()
        this.logger.log(`Sync complete. Total processed: ${finalSucceeded}, total failed: ${finalFailed}`);

        return { succeededThisRun, failedThisRun, totalSucceeded: finalSucceeded, totalSkipped: finalSkipped, totalFailed: finalFailed };
    }

    private async processEntry(entry: CatalogEntry): Promise<boolean> {
        try {

            if (!entry.resourceId || typeof entry.resourceId !== 'string' || entry.resourceId.trim() === '') {
                await this.markSkipped(entry.nid, 'no_resource_id', entry.title);
                this.logger.log(`no resourceId found: ${await this.totalNidProcessed()}`);
                return true;
            }

            const resourceData = await this.resource.fetchResource({ resourceId: entry.resourceId });
            const records = resourceData.records ?? [];

            if (records.length > 0) {
                await this.persist(entry, entry.resourceId, records);
                this.logger.log(`✓ Saved ${entry.title} [${entry.resourceId}] (${records.length} records)`);
                return true;
            } else {
                await this.markSkipped(entry.nid, 'zero_records', entry.title);
                return true;
            }

        } catch (err: any) {
            this.logger.warn(`✗ Failed ${entry.nid} (${entry.title}): ${err.message}`);
            await this.syncSkipModel.updateOne(
                { nid: entry.nid },
                {
                    $set: { title: entry.title, errorMessage: err.message },
                    $inc: { attemptCount: 1 },
                },
                { upsert: true },
            );
            return false;
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


    private async totalNidProcessed(): Promise<number> {
        return this.datasetModel.countDocuments();
    }

    private async totalSkipped(): Promise<number> {
        return this.syncSkipModel.countDocuments();
    }

    private async markFailed(nid: number, title: string, errorMessage: string) {
        await this.syncFailureModel.updateOne(
            { nid },
            {
                $set: { title, errorMessage },
                $inc: { attemptCount: 1 },
            },
            { upsert: true },
        );
    }

    private async totalFailed(): Promise<number> {
        return this.syncFailureModel.countDocuments();
    }
    private async isAlreadyProcessed(nid: number): Promise<boolean> {
        const [inData, inSkip] = await Promise.all([
            this.datasetModel.exists({ nid }),
            this.syncSkipModel.exists({ nid }),
        ]);
        return !!(inData || inSkip);
    }



    private async markSkipped(nid: number, reason: string, title: string) {
        try {
            const result = await this.syncSkipModel.updateOne(
                { nid },
                { $set: { reason, title } },
                { upsert: true },
            );
        } catch (err: any) {
            this.logger.error(`markSkipped FAILED for nid ${nid}: ${err.message}`);
            throw err;
        }
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}