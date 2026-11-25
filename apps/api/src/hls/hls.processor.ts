import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { unlink } from 'fs/promises';
import { HlsService } from './hls.service';
import { HLS_QUEUE, HlsJobData } from './hls.constants';

@Processor(HLS_QUEUE, { concurrency: 1 }) // 1 video at a time, FFmpeg is CPU heavy
export class HlsProcessor extends WorkerHost {
    private readonly logger = new Logger(HlsProcessor.name);

    constructor(private readonly hlsService: HlsService) {
        super();
    }

    async process(job: Job<HlsJobData>) {
        const { inputPath, videoId } = job.data;
        const playlistUrl = await this.hlsService.convertToHls(
            inputPath,
            videoId,
            (percent) => job.updateProgress(percent),
        );
        return { playlistUrl };
    }

    @OnWorkerEvent('completed')
    async onCompleted(job: Job<HlsJobData>) {
        this.logger.log(`Job ${job.id} completed`);
        await unlink(job.data.inputPath).catch(() => undefined);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job<HlsJobData> | undefined, err: Error) {
        if (!job) return;
        this.logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
        // delete the upload only after the last retry
        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
            await unlink(job.data.inputPath).catch(() => undefined);
        }
    }
}