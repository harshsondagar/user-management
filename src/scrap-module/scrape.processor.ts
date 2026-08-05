import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { FullSyncService } from "../sync/full-sync.service";

@Processor('scrape-gov-data',
    {
        concurrency: 1,
        lockDuration: 60000,      // if no heartbeat in 30s, consider it stalled
        stalledInterval: 30000,   // check for stalled jobs every 30s
        maxStalledCount: 3,       // retry a stalled job up to 2 times before failing it permanently
    }
)
export class ScrapeProcessor extends WorkerHost {

    constructor(private readonly fullSyncService: FullSyncService) {
        super()
    }

    async process(job: Job, token?: string): Promise<any> {
        const { query, userId } = job.data
        const res = await this.fullSyncService.runFullSync(query, job)

        return {
            ...res,                              // succeededThisRun, failedThisRun, totalSucceeded, totalFailed (from earlier)
            finishedAt: new Date().toISOString(),
        };
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
    onFailed(job: Job, error: Error) {
        console.error(`[Worker] Failed job ${job.id}:`, error.message);
    }


}