import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

@Injectable()
export class WebhookProducer {
    constructor(@InjectQueue('stripe-events') private readonly queue: Queue) { }

    async processEvent(eventId: string, eventType: string, data: any) {
        return this.queue.add(
            'process-stripe-event',
            { eventId, eventType, data },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
    }
}