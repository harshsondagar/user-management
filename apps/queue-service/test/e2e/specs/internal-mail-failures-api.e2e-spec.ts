import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { MailJobName } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { internalRequest } from '../utils/internal-api-utils';
import { seedMailFailure } from '../utils/mail-failure-utils';

describe('Internal Mail Failures API (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createQueueTestApp();
        disableCronJobs(app);
        dataSource = app.get(DataSource);

        jest.spyOn(console, 'log').mockImplementation(() => { });
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
            await request(app.getHttpServer()).get('/internal/mail-failures').expect(401);
        });

        it('accepts requests with the correct secret', async () => {
            await internalRequest(app).get('/internal/mail-failures').expect(200);
        });
    });

    describe('GET /internal/mail-failures', () => {
        it('returns entries with pagination metadata', async () => {
            await seedMailFailure(app, { jobName: MailJobName.WELCOME, recipientEmail: 'a@b.com', bullJobId: 'job-1' });
            await seedMailFailure(app, { jobName: MailJobName.VERIFY_EMAIL, recipientEmail: 'c@d.com', bullJobId: 'job-2' });

            const res = await internalRequest(app).get('/internal/mail-failures').expect(200);

            expect(res.body.total).toBe(2);
            expect(res.body.page).toBe(1);
            expect(res.body.pageSize).toBe(20);
            expect(res.body.entries).toHaveLength(2);
        });

        it('filters by jobName', async () => {
            await seedMailFailure(app, { jobName: MailJobName.WELCOME, bullJobId: 'job-3' });
            await seedMailFailure(app, { jobName: MailJobName.VERIFY_EMAIL, bullJobId: 'job-4' });

            const res = await internalRequest(app)
                .get(`/internal/mail-failures?jobName=${MailJobName.WELCOME}`)
                .expect(200);

            expect(res.body.entries).toHaveLength(1);
            expect(res.body.entries[0].bullJobId).toBe('job-3');
        });

        it('paginates results', async () => {
            for (let i = 0; i < 5; i++) {
                await seedMailFailure(app, { bullJobId: `job-page-${i}` });
            }

            const res = await internalRequest(app).get('/internal/mail-failures?page=2&pageSize=2').expect(200);

            expect(res.body.entries).toHaveLength(2);
            expect(res.body.page).toBe(2);
            expect(res.body.total).toBe(5);
        });

        it('returns an empty list when there are no failures', async () => {
            const res = await internalRequest(app).get('/internal/mail-failures').expect(200);
            expect(res.body.entries).toEqual([]);
            expect(res.body.total).toBe(0);
        });
    });

    describe('GET /internal/mail-failures/stats', () => {
        it('groups counts by jobName', async () => {
            await seedMailFailure(app, { jobName: MailJobName.WELCOME, bullJobId: 'job-s1' });
            await seedMailFailure(app, { jobName: MailJobName.WELCOME, bullJobId: 'job-s2' });
            await seedMailFailure(app, { jobName: MailJobName.VERIFY_EMAIL, bullJobId: 'job-s3' });

            const res = await internalRequest(app).get('/internal/mail-failures/stats').expect(200);

            expect(res.body.total).toBe(3);
            expect(res.body.byJobName).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ jobName: MailJobName.WELCOME, count: '2' }),
                    expect.objectContaining({ jobName: MailJobName.VERIFY_EMAIL, count: '1' }),
                ]),
            );
        });
    });
});