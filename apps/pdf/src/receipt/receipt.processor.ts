import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PDF_QUEUE, PDF_JOBS, ReceiptStorageService, receiptKey } from '@app/shared';
import { BrowserService } from '../browser/browser.service';
import { renderReceipt } from './receipt.template';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';



@Processor(PDF_QUEUE, { concurrency: 3 })
export class ReceiptProcessor extends WorkerHost {
    constructor(
        private readonly browser: BrowserService,
        private readonly storage: ReceiptStorageService,
    ) {
        super();
    }

    async process(job: Job<GenerateReceiptDto>) {
        if (job.name !== PDF_JOBS.RECEIPT) return;

        const pdf = await this.browser.htmlToPdf(renderReceipt(job.data));

        const key = receiptKey(job.data.paymentId);
        await this.storage.upload(key, pdf);
        return { key };
    }
}