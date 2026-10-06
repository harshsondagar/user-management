import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PDF_QUEUE, PDF_JOBS } from '@app/shared';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';

@Injectable()
export class ReceiptDispatcher {
    constructor(@InjectQueue(PDF_QUEUE) private readonly queue: Queue) { }

    enqueue(data: GenerateReceiptDto) {
        return this.queue.add(PDF_JOBS.RECEIPT, data, {
            jobId: `receipt-${data.paymentId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
        });
    }
}