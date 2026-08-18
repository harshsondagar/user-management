import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { Logger } from "@nestjs/common";
import { StripeWebhookRepository } from "../billing/repositorys/stripe-webhook.repository";
import { WebhookProducer } from "./webhook.producer";




@Injectable()
export class StripeWebhookService {
    private readonly logger = new Logger(StripeWebhookService.name);
    private readonly webhookSecret: string;

    constructor(
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
        private readonly config: ConfigService,
        private readonly webhookEventRepo: StripeWebhookRepository,
        private readonly webhookProducer: WebhookProducer,
    ) {
        this.webhookSecret = this.config.get<string>('stripe.webhookSecret')!;
    }

    async processWebhook(rawBody: Buffer, signature: string): Promise<void> {
        let event: Stripe.Event
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
        } catch (err: any) {
            this.logger.warn(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
        }

        const existing = await this.webhookEventRepo.findOne({ where: { stripeEventId: event.id } });

        if (existing) {
            this.logger.log(`Duplicate webhook event ${event.id} (${event.type}) — already processed, skipping`);
            return;
        }

        await this.webhookEventRepo.create({
            stripeEventId: event.id,
            type: event.type,
            payload: event as any,
            processedAt: null,
        })

        await this.webhookProducer.processEvent(event.id, event.type, event.data.object);

        this.logger.log(`Webhook ${event.id} (${event.type}) recorded and queued for processing`);
    }

}