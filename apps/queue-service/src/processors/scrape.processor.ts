import "dotenv/config"
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { FullSyncService } from "../sync/full-sync.service";
import { DlqService } from "../dlq/dlq.service";
import { runWithJobContext } from "@app/shared";

// const workerId = process.env.JEST_WORKER_ID!
// process.env.QUEUE_SUFFIX = `_worker_${workerId}`
// const QUEUE_NAME = `scrape-gov-data${process.env.QUEUE_SUFFIX || ''}`;

// console.log("queue name : from processor :", QUEUE_NAME);

@Processor('scrape-gov-data',
    {
        concurrency: 1,
        lockDuration: 60000,
        stalledInterval: 60000,
        maxStalledCount: 3,
    }
)
export class ScrapeProcessor extends WorkerHost {

    constructor(
        private readonly fullSyncService: FullSyncService,
        private readonly dlqService: DlqService,
    ) {
        super()
    }

    async process(job: Job, token?: string): Promise<any> {
        return runWithJobContext(job, async () => {
            const { query, userId } = job.data
            return this.fullSyncService.runFullSync(query, job)
        })
    }

    @OnWorkerEvent('active')
    onActive(job: Job) {
        console.log(`[Worker] Started processing job ${job.id}`);
    }
    @OnWorkerEvent('completed')
    onCompleted(job: Job, result: any) {
        console.log(`[Worker] Completed job ${job.id}`);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job, error: Error) {
        console.error(`[Worker] Failed job ${job.id}:`, error.message);

        const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1)

        if (!isFinalAttempt) {
            return;
        }

        await this.dlqService.recordJobFailure({
            bullJobId: String(job.id),
            userId: job.data.userId,
            query: job.data.query,
            errorMessage: error.message,
            errorStack: error.stack,
            rawContext: { jobData: job.data, attemptsMade: job.attemptsMade },
        });
    }

}