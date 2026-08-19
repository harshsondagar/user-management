import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import { StripeWebhookRepository } from "../billing/repositorys/stripe-webhook.repository";
import { SubscriptionStatus } from "../billing/entities/user-subscription-entity";
import { PaymentStatus } from "../billing/entities/payment-entity";
import * as Sentry from '@sentry/node';
import { UserSubscriptionRepository } from "../billing/repositorys/user-subscription.repository";
import { PaymentRepository } from "../billing/repositorys/payment.repository";

export interface StripeJobData {
    eventId: string;
    eventType: string;
    data: any;
}

const DAYS_PER_CYCLE = 30;

@Injectable()
@Processor('stripe-events', { concurrency: 1 })
export class StripeEventProcessor extends WorkerHost {
    private readonly logger = new Logger(StripeEventProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly webhookEventRepo: StripeWebhookRepository,
        private readonly subRepo: UserSubscriptionRepository,
        private readonly paymentRepo: PaymentRepository
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { eventId, eventType, data } = job.data as StripeJobData;

        switch (eventType) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(data); // no try/catch here — let it throw
                break;
            case 'payment_intent.payment_failed':
                this.logger.warn(`payment_intent.payment_failed: pi=${data.id}`);
                break;
            case 'payment_intent.succeeded': {
                if (data.metadata?.type === 'renewal') {
                    await this.handleRenewalSucceeded(data);
                }
                break;
            }
            default:
                break;
        }

        // Only reached if the handler above completed without throwing.
        await this.webhookEventRepo.updateBy({ stripeEventId: eventId }, { processedAt: new Date() });
    }

    private async handleCheckoutCompleted(session: any) {
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
            this.logger.error(`checkout.session.completed missing metadata: session=${session.id}`);
            return;
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        const newSubscription = await this.subRepo.transitionToNewPlan(userId, planId, {
            stripeSubscriptionId: null,
            currentPeriodEnd: periodEnd,
        });

        if (session.payment_intent) {
            await this.paymentRepo.create({
                userSubscriptionId: newSubscription.id,
                stripeInvoiceId: session.payment_intent,
                amount: session.amount_total,
                currency: session.currency,
                status: PaymentStatus.SUCCEEDED,
                paidAt: new Date(),
            });
        }
    }
    private async handleRenewalSucceeded(pi: any) {
        const { userId, planId, userSubscriptionId } = pi.metadata;
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        await this.dataSource.transaction(async (manager) => {
            await manager.getRepository('user_subscriptions').update(userSubscriptionId, {
                currentPeriodEnd: periodEnd,
                status: SubscriptionStatus.ACTIVE, // clears any 'past_due'/grace flag from the downgrade job below
            });

            await manager.createQueryBuilder().insert().into('payments').values({
                userSubscriptionId,
                stripeInvoiceId: pi.id,
                amount: pi.amount,
                currency: pi.currency,
                status: PaymentStatus.SUCCEEDED,
                paidAt: new Date(),
            }).execute();
        });
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        // This is the ONLY reliable place to catch a payment-processing job failure —
        // GlobalExceptionFilter never sees this, since there's no HTTP context here.
        this.logger.error(
            `Stripe event job FAILED: eventId=${job.data?.eventId} type=${job.data?.eventType} attempt=${job.attemptsMade}/${job.opts.attempts}`,
            error.stack,
        );
        Sentry.captureException(error, {
            tags: { context: 'stripe-webhook-processing', eventId: job.data?.eventId, eventType: job.data?.eventType },
            extra: { jobData: job.data },
        });
    }
}