
import { Queue } from 'bullmq';

export async function getLastJobByName(queue: Queue, name: string) {
    const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed']);
    return jobs.filter((j) => j.name === name).sort((a, b) => b.timestamp - a.timestamp)[0];
}