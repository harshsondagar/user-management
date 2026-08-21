import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DlqStatus, FailureScope } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { clearDatasets, getDatasetModel } from '../utils/mongo-utils';
import { seedPendingResourceFailure, findDlqEntry } from '../utils/dlq-utils';
import { internalRequest } from '../utils/internal-api-utils';
import { mockResourceSuccess, mockResourceFailure } from "../utils/mock-data.gov.in"
import { DlqRetrySweepService } from '../../../src/dlq/dlq-retry-sweep.service';
import request from 'supertest';
import { DatagovResourceService } from '../../../src/data-gov/datagov-resource.service';
import { Logger } from '@nestjs/common';

describe('DLQ retry sweep (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createQueueTestApp();
        disableCronJobs(app);
        dataSource = app.get(DataSource);
        await truncateAllTables(dataSource);
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });

    });
    afterEach(async () => {
        await truncateAllTables(dataSource);
        await clearDatasets(app);
    });

    afterAll(async () => {
        await app.close();
        jest.clearAllMocks();

    });

    it('resolves a pending entry and stores the dataset when the retry succeeds', async () => {
        const entry = await seedPendingResourceFailure(app, {
            resourceId: 'res-success',
            title: 'Weather Dataset',
        });
        expect(entry.status).toBe(DlqStatus.PENDING_RETRY);

        mockResourceSuccess('res-success', {
            records: [{ city: 'Surat', temp: 32 }],
        });

        const resourceService = app.get(DatagovResourceService);

        await app.get(DlqRetrySweepService).sweep();

        const updated = await findDlqEntry(app, entry.id);
        expect(updated?.status).toBe(DlqStatus.RESOLVED);

        const dataset = await getDatasetModel(app).findOne({ resourceId: 'res-success' });
        expect(dataset).toBeTruthy();
        expect(dataset?.recordCount).toBe(1);
    });
    it('resolves as empty (no dataset write) when retry succeeds with zero records', async () => {
        const entry = await seedPendingResourceFailure(app, {
            resourceId: 'res-empty',
            title: 'Empty Dataset',
        });

        mockResourceSuccess('res-empty', { records: [] });

        await app.get(DlqRetrySweepService).sweep();

        const updated = await findDlqEntry(app, entry.id);
        expect(updated?.status).toBe(DlqStatus.RESOLVED);

        const dataset = await getDatasetModel(app).findOne({ resourceId: 'res-empty' });
        expect(dataset).toBeNull();
    });

    it('marks the entry permanently failed when the retry fails again', async () => {
        const entry = await seedPendingResourceFailure(app, {
            resourceId: 'res-fail',
            title: 'Broken Dataset',
        });

        mockResourceFailure('res-fail', 500, 1);

        await app.get(DlqRetrySweepService).sweep();

        const updated = await findDlqEntry(app, entry.id);
        expect(updated?.status).toBe(DlqStatus.PERMANENTLY_FAILED);
        expect(updated?.retryErrorMessage).toBeTruthy();
        expect(updated?.attemptCount).toBe(2); // 1 from seed, +1 from markPermanentlyFailed
    });

    it('processes multiple pending entries in one sweep', async () => {
        const a = await seedPendingResourceFailure(app, { resourceId: 'res-a', title: 'A' });
        const b = await seedPendingResourceFailure(app, { resourceId: 'res-b', title: 'B' });

        mockResourceSuccess('res-a', { records: [{ id: 1 }] });
        mockResourceFailure('res-b', 500, 1);

        await app.get(DlqRetrySweepService).sweep();

        expect((await findDlqEntry(app, a.id))?.status).toBe(DlqStatus.RESOLVED);
        expect((await findDlqEntry(app, b.id))?.status).toBe(DlqStatus.PERMANENTLY_FAILED);
    });

    describe('internal DLQ API', () => {
        it('surfaces entries created by the sweep flow', async () => {
            const entry = await seedPendingResourceFailure(app, { resourceId: 'res-visible', title: 'Visible' });

            const res = await internalRequest(app)
                .get(`/internal/dlq/entries?scope=${FailureScope.RESOURCE}&status=${DlqStatus.PENDING_RETRY}`)
                .expect(200);

            expect(res.body.entries).toEqual(
                expect.arrayContaining([expect.objectContaining({ id: entry.id, resourceId: 'res-visible' })]),
            );
        });

        it('rejects requests without the internal secret', async () => {
            await request(app.getHttpServer()).get('/internal/dlq/entries').expect(401);
        });

        it('returns stats reflecting current DLQ state', async () => {
            await seedPendingResourceFailure(app, { resourceId: 'res-stat-1' });
            const res = await internalRequest(app).get('/internal/dlq/stats').expect(200);
            expect(res.body.pendingResource).toBeGreaterThanOrEqual(1);
        });
    });
});