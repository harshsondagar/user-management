import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DlqStatus, FailureScope } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { clearDatasets } from '../utils/mongo-utils';
import { getScrapeQueue, obliterateQueue } from '../utils/queue-utils';
import { waitForJobFailure } from '../helper/job-helper';
import { getDlqRepo } from '../utils/dlq-utils';

describe('Scrape sync — job-level failure (e2e)', () => {
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
        await clearDatasets(app);
        await obliterateQueue(getScrapeQueue(app));
    });

    afterAll(async () => {
        await app.close();
        jest.clearAllMocks();

    });

    it('records a JOB-scope DLQ entry after the final retry attempt', async () => {
        const queue = getScrapeQueue(app);

        const job = await queue.add(
            'scrape-gov-data',
            { query: 'CRASH_TEST', userId: 'user-1' },
            { attempts: 1 },
        );

        const err = await waitForJobFailure(queue, job.id!);
        expect(err.message).toContain('Deliberate job-level crash');

        const dlqRepo = getDlqRepo(app);
        const entry = await dlqRepo.findOne({ where: { bullJobId: String(job.id), failureScope: FailureScope.JOB } });

        expect(entry).toBeTruthy();
        expect(entry?.status).toBe(DlqStatus.PERMANENTLY_FAILED);
        expect(entry?.userId).toBe('user-1');
        expect(entry?.errorMessage).toContain('Deliberate job-level crash');
    });

    it('does not record a DLQ entry before the final attempt is exhausted', async () => {
        const queue = getScrapeQueue(app);

        const job = await queue.add(
            'scrape-gov-data',
            { query: 'CRASH_TEST', userId: 'user-2' },
            { attempts: 3, backoff: { type: 'fixed', delay: 100 } },
        );

        // first attempt fails, but 2 retries remain — onFailed should skip DLQ write
        await waitForJobFailure(queue, job.id!, 2000).catch(() => {

        });

        const dlqRepo = getDlqRepo(app);
        const entry = await dlqRepo.findOne({ where: { bullJobId: String(job.id), failureScope: FailureScope.JOB } });
        expect(entry).toBeNull();

        // let it exhaust all attempts before the suite moves on / queue is obliterated
        await waitForJobFailure(queue, job.id!, 5000);
    });
});