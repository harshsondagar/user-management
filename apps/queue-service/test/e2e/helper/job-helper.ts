import { Job, Queue, QueueEvents } from "bullmq";

export async function waitForJobResult(queue: Queue, jobId: string, timeoutMs = 10_000) {
    const queueEvents = new QueueEvents(queue.name, { connection: queue.opts.connection });
    await queueEvents.waitUntilReady();
    const job = await Job.fromId(queue, jobId);
    try {
        return await job!.waitUntilFinished(queueEvents, timeoutMs);
    } finally {
        await queueEvents.close();
    }
}

export async function waitForJobFailure(queue: Queue, jobId: string, timeoutMs = 10_000) {
    try {
        await waitForJobResult(queue, jobId, timeoutMs);
        throw new Error(`Expected job ${jobId} to fail, but it completed.`);
    } catch (err) {
        return err as Error; // caller can assert on err.message / job.failedReason
    }
}