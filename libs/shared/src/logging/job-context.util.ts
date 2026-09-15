import { Job } from 'bullmq';
import { logContextStore } from './log-context';
import { JobLogContext } from '../type/type';

export function runWithJobContext<T>(job: Job, fn: () => Promise<T>): Promise<T> {
    const context: JobLogContext = {
        type: 'job',
        jobId: String(job.id),
        jobName: job.name,
        queue: job.queueName,
        attemptsMade: job.attemptsMade,
        finishedAt: new Date().toISOString(),
    };

    return logContextStore.run(context, fn);
}