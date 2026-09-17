import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MailJobName } from '@app/shared';
import { createQueueTestApp } from '../utils/app-factory-utils';
import { disableCronJobs } from '../utils/cron-utils';
import { truncateAllTables } from '../utils/db-utils';
import { getSendMailQueue, obliterateQueue } from '../utils/queue-utils';
import { waitForJobResult, waitForJobFailure } from '../helper/job-helper';
import { getMailFailureRepo } from '../utils/mail-failure-utils';
import { mockMailService } from '../utils/mock-mail-utils';

describe('Mail processor (e2e)', () => {
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
        await obliterateQueue(getSendMailQueue(app));
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('happy path — each job type dispatches to the right MailService method', () => {
        it('VERIFY_EMAIL calls sendOtpEmail with the right args', async () => {
            const queue = getSendMailQueue(app);
            const job = await queue.add(MailJobName.VERIFY_EMAIL, {
                email: 'a@b.com',
                firstName: 'Alice',
                otp: '123456',
            });

            await waitForJobResult(queue, job.id!);

            expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith('a@b.com', 'Alice', '123456');
        });

        it('WELCOME calls sendWelcomeMail with the right args', async () => {
            const queue = getSendMailQueue(app);
            const job = await queue.add(MailJobName.WELCOME, { email: 'b@c.com', firstName: 'Bob' });

            await waitForJobResult(queue, job.id!);

            expect(mockMailService.sendWelcomeMail).toHaveBeenCalledWith('b@c.com', 'Bob');
        });

        it('PASSWORD_CHANGE_OTP calls sendPasswordChangeMail with the right args', async () => {
            const queue = getSendMailQueue(app);
            const job = await queue.add(MailJobName.PASSWORD_CHANGE_OTP, {
                email: 'd@e.com',
                resetUrl: 'https://app.example.com/reset/xyz',
            });

            await waitForJobResult(queue, job.id!);

            expect(mockMailService.sendPasswordChangeMail).toHaveBeenCalledWith('d@e.com', 'https://app.example.com/reset/xyz');
        });

        it('WEEKLY_ADMIN_REPORT calls sendReportMail with the right args', async () => {
            const queue = getSendMailQueue(app);
            const job = await queue.add(MailJobName.WEEKLY_ADMIN_REPORT, {
                adminEmail: 'admin@example.com',
                newUsersCount: 42,
                reportData: { signups: 42 },
            });

            await waitForJobResult(queue, job.id!);

            expect(mockMailService.sendReportMail).toHaveBeenCalledWith('admin@example.com', 42, { signups: 42 });
        });
    });

    describe('failure path — records a MailFailure on the final attempt', () => {
        it('records failure with recipientEmail for jobs whose payload uses `email`', async () => {
            mockMailService.sendWelcomeMail.mockRejectedValueOnce(new Error('SMTP timeout'));
            const queue = getSendMailQueue(app);
            const job = await queue.add(
                MailJobName.WELCOME,
                { email: 'fail@example.com', firstName: 'Failer' },
                { attempts: 1 },
            );

            await waitForJobFailure(queue, job.id!);

            const entry = await getMailFailureRepo(app).findOne({ where: { bullJobId: String(job.id) } });
            expect(entry).toBeTruthy();
            expect(entry?.jobName).toBe(MailJobName.WELCOME);
            expect(entry?.recipientEmail).toBe('fail@example.com');
            expect(entry?.errorMessage).toBe('SMTP timeout');
            expect(entry?.attemptsMade).toBe(1);
        });

        it('does not record a failure before the final attempt is exhausted', async () => {
            mockMailService.sendWelcomeMail.mockRejectedValue(new Error('transient failure'));
            const queue = getSendMailQueue(app);
            const job = await queue.add(
                MailJobName.WELCOME,
                { email: 'retry@example.com', firstName: 'Retry' },
                { attempts: 3, backoff: { type: 'fixed', delay: 100 } },
            );

            // let it exhaust all attempts, then assert exactly one MailFailure row exists
            await waitForJobFailure(queue, job.id!, 5000);

            const entries = await getMailFailureRepo(app).find({ where: { bullJobId: String(job.id) } });
            expect(entries).toHaveLength(1);
            expect(entries[0].attemptsMade).toBe(3);
        });

    });
});