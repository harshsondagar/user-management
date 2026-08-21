import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { DlqStatus, FailureScope } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { clearDatasets, getDatasetModel, getSyncSkipModel } from '../utils/mongo-utils';
import { getScrapeQueue, obliterateQueue } from '../utils/queue-utils';
import { waitForJobResult } from '../helper/job-helper';
import { getDlqRepo } from '../utils/dlq-utils';
import { mockSearchSuccess, mockResourceSuccess, mockResourceFailure } from '../utils/mock-data.gov.in';
import { buildRawCatalogRow, buildSearchResponse } from '../fixture/catalog-fixtures';
import { FullSyncService } from '../../../src/sync/full-sync.service';

describe('Scrape sync — resource-level processing (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createQueueTestApp();
        disableCronJobs(app);
        dataSource = app.get(DataSource);
        await truncateAllTables(dataSource);
        await clearDatasets(app);

        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(async () => {
        await truncateAllTables(dataSource);
        await clearDatasets(app);
        await obliterateQueue(getScrapeQueue(app));
    });
    beforeEach(async () => {
        await obliterateQueue(getScrapeQueue(app));
        jest.clearAllMocks();

    })

    afterAll(async () => {
        await app.close();
        jest.restoreAllMocks();
    });

    describe('via the real queue + processor', () => {
        it('persists a Dataset when the resource fetch succeeds', async () => {
            const row = buildRawCatalogRow({ nid: 2001, uuid: 'res-scrape-success', title: 'Rainfall Data' });
            mockSearchSuccess(buildSearchResponse([row]));
            mockResourceSuccess('res-scrape-success', { records: [{ station: 'A', mm: 12 }] });

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'rainfall', userId: 'u1' });
            const result = await waitForJobResult(queue, job.id!);

            expect(result).toMatchObject({ succeededThisRun: 1, failedThisRun: 0, totalSucceeded: 1, totalFailed: 0 });

            const dataset = await getDatasetModel(app).findOne({ resourceId: 'res-scrape-success' });
            expect(dataset?.toObject()).toMatchObject({
                nid: 2001,
                title: 'Rainfall Data',
                ministry: 'Ministry of Testing',
                recordCount: 1,
            });
        });

        it('creates a SyncSkip with reason zero_records when the resource has no records', async () => {
            const row = buildRawCatalogRow({ nid: 2002, uuid: 'res-empty', title: 'Empty Dataset' });
            mockSearchSuccess(buildSearchResponse([row]));
            mockResourceSuccess('res-empty', { records: [] });

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'empty', userId: 'u1' });
            await waitForJobResult(queue, job.id!);

            const skip = await getSyncSkipModel(app).findOne({ nid: 2002 });
            expect(skip).toMatchObject({ reason: 'zero_records' });

            const dataset = await getDatasetModel(app).findOne({ resourceId: 'res-empty' });
            expect(dataset).toBeNull();
        });

        it('creates a SyncSkip with reason no_resource_id when uuid is blank', async () => {
            const row = buildRawCatalogRow({ nid: 2003, uuid: '', title: 'No Resource' });
            mockSearchSuccess(buildSearchResponse([row]));
            // no resource-endpoint mock needed — code should never call fetchResource for this entry

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'no-id', userId: 'u1' });
            await waitForJobResult(queue, job.id!);

            const skip = await getSyncSkipModel(app).findOne({ nid: 2003 });

            expect(skip).toMatchObject({ reason: 'no_resource_id' });
        });

        it('records a RESOURCE-scope DLQ entry when the resource fetch fails, and the job still completes', async () => {
            const row = buildRawCatalogRow({ nid: 2004, uuid: 'res-broken', title: 'Broken Dataset' });
            mockSearchSuccess(buildSearchResponse([row]));
            mockResourceFailure('res-broken', 500, 1);

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'broken', userId: 'u1' });
            const result = await waitForJobResult(queue, job.id!);

            expect(result).toMatchObject({ succeededThisRun: 0, failedThisRun: 1 });

            const dlqEntry = await getDlqRepo(app).findOne({
                where: { resourceId: 'res-broken', failureScope: FailureScope.RESOURCE },
            });

            expect(dlqEntry?.status).toBe('pending_retry');
            expect(dlqEntry?.resourceId).toBe('res-broken');
            expect(dlqEntry?.rawContext?.nid).toBe(2004);
        });

        it('skips entries whose nid was already processed, without re-fetching the resource', async () => {
            await getDatasetModel(app).create({
                nid: 2005,
                resourceId: 'res-already',
                title: 'Already Done',
                records: [{ x: 1 }],
                recordCount: 1,
                fetchedAt: new Date(),
            });

            const row = buildRawCatalogRow({ nid: 2005, uuid: 'res-already', title: 'Already Done (stale catalog copy)' });
            mockSearchSuccess(buildSearchResponse([row]));

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'dup', userId: 'u1' });
            const result = await waitForJobResult(queue, job.id!);


            expect(result).toMatchObject({
                succeededThisRun: 0,
                failedThisRun: 0,
                totalSucceeded: 1
            });

            const dlqEntry = await getDlqRepo(app).findOne({ where: { resourceId: 'res-already' } });
            expect(dlqEntry).toBeNull();
        });

        it('processes entries across two catalog pages when total exceeds pageSize', async () => {
            const rowA = buildRawCatalogRow({ nid: 3001, uuid: 'res-page1' });
            const rowB = buildRawCatalogRow({ nid: 3002, uuid: 'res-page2' });

            // first /search call (offset 0) — total > pageSize(100) so iterateAll fetches again
            mockSearchSuccess(buildSearchResponse([rowA], 150));
            // second /search call (offset 100)
            mockSearchSuccess(buildSearchResponse([rowB], 150));

            mockResourceSuccess('res-page1', { records: [{ v: 1 }] });
            mockResourceSuccess('res-page2', { records: [{ v: 2 }] });

            const queue = getScrapeQueue(app);
            const job = await queue.add('scrape-gov-data', { query: 'paged', userId: 'u1' });
            const result = await waitForJobResult(queue, job.id!);

            expect(result).toMatchObject({ succeededThisRun: 2, failedThisRun: 0, totalSucceeded: 2, totalFailed: 0 });

            console.log(await getDatasetModel(app).countDocuments());

            expect(await getDatasetModel(app).countDocuments()).toBe(2);
        });
    });

    describe('maxEntries cap (direct service call — not exposed via job.data today)', () => {
        it('stops processing once the cap is reached', async () => {
            const rows = [1, 2, 3].map((n) =>
                buildRawCatalogRow({ nid: 4000 + n, uuid: `res-cap-${n}`, title: `Capped ${n}` }),
            );
            mockSearchSuccess(buildSearchResponse(rows));
            mockResourceSuccess('res-cap-1', { records: [{ v: 1 }] });
            mockResourceSuccess('res-cap-2', { records: [{ v: 2 }] });
            // no mock for res-cap-3 — should never be requested if the cap works

            const fullSyncService = app.get(FullSyncService);
            const fakeJob = { updateProgress: jest.fn() } as unknown as Job;

            const result = await fullSyncService.runFullSync('capped', fakeJob, 2);

            expect(result.succeededThisRun).toBe(2);
            expect(await getDatasetModel(app).countDocuments()).toBe(2);
            expect(fakeJob.updateProgress).toHaveBeenCalledTimes(2);
        });
    });
});