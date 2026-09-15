import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { DlqStatus, FailureScope } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { internalRequest } from '../utils/internal-api-utils';
import { seedPendingResourceFailure, getDlqRepo } from '../utils/dlq-utils';
import { DlqService } from '../../../src/dlq/dlq.service';

describe('Internal DLQ API (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createQueueTestApp();
        disableCronJobs(app);
        dataSource = app.get(DataSource);
        jest.spyOn(console, 'error').mockImplementation(() => { });

    });

    afterEach(async () => {
        await truncateAllTables(dataSource);
    });

    afterAll(async () => {
        await app.close();
        jest.clearAllMocks();

    });

    describe('auth', () => {
        it('rejects requests with no secret header', async () => {
            await request(app.getHttpServer()).get('/internal/dlq/entries').expect(401);
        });

        it('rejects requests with a wrong secret', async () => {
            await request(app.getHttpServer())
                .get('/internal/dlq/entries')
                .set('x-internal-secret', 'wrong-value')
                .expect(401);
        });

        it('accepts requests with the correct secret', async () => {
            await internalRequest(app).get('/internal/dlq/entries').expect(200);
        });
    });

    describe('GET /internal/dlq/entries', () => {
        it('returns entries with pagination metadata', async () => {
            await seedPendingResourceFailure(app, { resourceId: 'res-1', title: 'One' });
            await seedPendingResourceFailure(app, { resourceId: 'res-2', title: 'Two' });

            const res = await internalRequest(app).get('/internal/dlq/entries').expect(200);

            expect(res.body.total).toBe(2);
            expect(res.body.page).toBe(1);
            expect(res.body.pageSize).toBe(20);
            expect(res.body.entries).toHaveLength(2);
            expect(res.body.entries[0]).toMatchObject({
                failureScope: FailureScope.RESOURCE,
                status: DlqStatus.PENDING_RETRY,
            });
        });

        it('filters by scope', async () => {
            await seedPendingResourceFailure(app, { resourceId: 'res-scope' });
            await app.get(DlqService).recordJobFailure({
                bullJobId: 'job-scope-1',
                query: 'q',
                errorMessage: 'boom',
            });

            const res = await internalRequest(app)
                .get(`/internal/dlq/entries?scope=${FailureScope.JOB}`)
                .expect(200);

            expect(res.body.entries).toHaveLength(1);
            expect(res.body.entries[0].bullJobId).toBe('job-scope-1');
        });

        it('filters by status', async () => {
            const entry = await seedPendingResourceFailure(app, { resourceId: 'res-status' });
            await getDlqRepo(app).update(entry.id, { status: DlqStatus.RESOLVED });
            await seedPendingResourceFailure(app, { resourceId: 'res-still-pending' });

            const res = await internalRequest(app)
                .get(`/internal/dlq/entries?status=${DlqStatus.RESOLVED}`)
                .expect(200);

            expect(res.body.entries).toHaveLength(1);
            expect(res.body.entries[0].resourceId).toBe('res-status');
        });

        it('paginates results', async () => {
            for (let i = 0; i < 5; i++) {
                await seedPendingResourceFailure(app, { resourceId: `res-page-${i}` });
            }

            const res = await internalRequest(app)
                .get('/internal/dlq/entries?page=2&pageSize=2')
                .expect(200);

            expect(res.body.entries).toHaveLength(2);
            expect(res.body.page).toBe(2);
            expect(res.body.total).toBe(5);
        });

        it('returns an empty list when there are no entries', async () => {
            const res = await internalRequest(app).get('/internal/dlq/entries').expect(200);
            expect(res.body.entries).toEqual([]);
            expect(res.body.total).toBe(0);
        });
    });

    describe('GET /internal/dlq/entries/:id', () => {
        it('returns a single entry by id', async () => {
            const entry = await seedPendingResourceFailure(app, { resourceId: 'res-single', title: 'Single' });

            const res = await internalRequest(app).get(`/internal/dlq/entries/${entry.id}`).expect(200);

            expect(res.body).toMatchObject({ id: entry.id, resourceId: 'res-single', title: 'Single' });
        });

        it('returns 404 for a non-existent id', async () => {
            await internalRequest(app)
                .get('/internal/dlq/entries/00000000-0000-0000-0000-000000000000')
                .expect(404);
        });
    });

    describe('GET /internal/dlq/stats', () => {
        it('reflects current counts across statuses and scopes', async () => {
            await seedPendingResourceFailure(app, { resourceId: 'res-stat-pending' });

            const permEntry = await seedPendingResourceFailure(app, { resourceId: 'res-stat-perm' });
            await getDlqRepo(app).update(permEntry.id, { status: DlqStatus.PERMANENTLY_FAILED });

            const resolvedEntry = await seedPendingResourceFailure(app, { resourceId: 'res-stat-resolved' });
            await getDlqRepo(app).update(resolvedEntry.id, { status: DlqStatus.RESOLVED });

            await app.get(DlqService).recordJobFailure({
                bullJobId: 'job-stat-1',
                query: 'q',
                errorMessage: 'boom',
            });

            const res = await internalRequest(app).get('/internal/dlq/stats').expect(200);

            expect(res.body).toMatchObject({
                pendingResource: 1,
                permanentResource: 1,
                permanentJob: 1,
                resolved: 1,
            });
        });
    });

    describe('POST /internal/dlq/entries/:id/resolve', () => {
        it('marks an entry resolved and records the admin who resolved it', async () => {
            const entry = await seedPendingResourceFailure(app, { resourceId: 'res-resolve' });

            await internalRequest(app)
                .post(`/internal/dlq/entries/${entry.id}/resolve?adminId=admin-42`)
                .expect(201); // default Nest status for @Post with no @HttpCode override

            const updated = await getDlqRepo(app).findOne({ where: { id: entry.id } });
            expect(updated?.status).toBe(DlqStatus.RESOLVED);
            expect(updated?.resolvedBy).toBe('admin-42');
            expect(updated?.resolvedAt).toBeTruthy();
        });
    });

    describe('POST /internal/dlq/entries/:id/ignore', () => {
        it('marks an entry ignored', async () => {
            const entry = await seedPendingResourceFailure(app, { resourceId: 'res-ignore' });

            await internalRequest(app).post(`/internal/dlq/entries/${entry.id}/ignore`).expect(201);

            const updated = await getDlqRepo(app).findOne({ where: { id: entry.id } });
            expect(updated?.status).toBe(DlqStatus.IGNORED);
        });
    });
});