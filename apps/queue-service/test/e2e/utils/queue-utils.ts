import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export function getScrapeQueue(app: INestApplication): Queue {
    const suffix = process.env.QUEUE_SUFFIX || '';
    return app.get<Queue>(getQueueToken(`scrape-gov-data`));
}

export function getSendMailQueue(app: INestApplication): Queue {
    return app.get<Queue>(getQueueToken('send-mail'));
}

export async function obliterateQueue(queue: Queue): Promise<void> {
    await queue.obliterate({ force: true });
}