import { Injectable, Logger } from "@nestjs/common";
import { WebhookProducer } from "./webhook.producer";
import { StripeWebhookRepository } from "../billing/repositorys/stripe-webhook.repository";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IsNull, LessThan } from "typeorm";




@Injectable()
export class WebhookReconciliationJob {
    private readonly logger = new Logger(WebhookReconciliationJob.name)

    constructor(
        private readonly webhookEventRepo: StripeWebhookRepository,
        private readonly webhookProducer: WebhookProducer,
    ) { }


    @Cron(CronExpression.EVERY_10_SECONDS)
    async run() {

        const cutoff = new Date(Date.now() - 10 * 60 * 1000)

        const stuck = await this.webhookEventRepo.findAll({
            where: { processedAt: IsNull(), createdAt: LessThan(cutoff) },
            order: { createdAt: 'ASC' },
            take: 100
        });
        if (stuck.length === 0) return;

        this.logger.warn(`Found ${stuck.length} stuck webhook event(s) — re-enqueueing for reprocessing`);

        for (const event of stuck) {
            try {
                const unwrapped = (event.payload as any)?.data?.object ?? event.payload;
                await this.webhookProducer.processEvent(event.stripeEventId, event.type, unwrapped);
            } catch (error) {
                this.logger.error(`Failed to re-enqueue stuck event ${event.stripeEventId}`, (error as Error).stack);
            }
        }
    }
}