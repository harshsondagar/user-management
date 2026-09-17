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
import { UserRepository } from "../user/user.repository";
import { MailProducer } from "../mail/mail-producer";

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
        private readonly userRepo: UserRepository,
        private readonly paymentRepo: PaymentRepository,
        private readonly mailProducer: MailProducer,
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { eventId, eventType, data } = job.data as StripeJobData;

        switch (eventType) {
            case 'payment_intent.succeeded': {
                const type = data.metadata?.type;
                if (type === 'initial_purchase') {
                    await this.handleInitialPurchaseSucceeded(data);
                }
                if (data.metadata?.type === 'renewal') {
                    await this.handleRenewalSucceeded(data);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                await this.handlePaymentFailed(data);
                break;
            }

            default:
                break;
        }

        // Only reached if the handler above completed without throwing.
        await this.webhookEventRepo.updateBy({ stripeEventId: eventId }, { processedAt: new Date() });
    }

    private async handleInitialPurchaseSucceeded(pi: any) {
        const userId = pi.metadata?.userId;
        const planId = pi.metadata?.planId;
        if (!userId || !planId) {
            this.logger.error(`payment_intent.succeeded (initial_purchase) missing metadata: pi=${pi.id}`);
            return;
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        await this.dataSource.transaction(async (manager) => {
            // Deactivate any existing active subscription, insert the new one —
            // same logic as transitionToNewPlan, run against THIS transaction's manager
            // so it's atomic together with the payment insert below.
            await manager
                .createQueryBuilder()
                .update('user_subscriptions')
                .set({ status: SubscriptionStatus.CANCELED, canceledAt: new Date() })
                .where('userId = :userId AND status = :status', { userId, status: SubscriptionStatus.ACTIVE })
                .execute();

            const insertResult = await manager
                .createQueryBuilder()
                .insert()
                .into('user_subscriptions')
                .values({
                    userId,
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    stripeSubscriptionId: null,
                    currentPeriodEnd: periodEnd,
                })
                .returning('id')
                .execute();

            const newSubscriptionId = insertResult.identifiers[0].id;

            await manager
                .createQueryBuilder()
                .insert()
                .into('payments')
                .values({
                    userSubscriptionId: newSubscriptionId,
                    stripeInvoiceId: pi.id,
                    amount: pi.amount,
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    paidAt: new Date(),
                })
                .execute();
        });
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

    private async handlePaymentFailed(pi: any) {
        const userId = pi.metadata?.userId;
        const type = pi.metadata?.type;

        if (!userId) {
            this.logger.warn(`payment_intent.payment_failed with no userId metadata: pi=${pi.id}`);
            return;
        }

        const user = await this.userRepo.findOneById(userId);
        const reason = pi.last_payment_error?.message ?? 'Your payment could not be completed.';

        if (type === 'renewal') {
            await this.mailProducer.addPaymentFailedMailJob(user.email, user.email.split('@')[0], reason);
        } else if (type === 'initial_purchase') {
            this.logger.warn(`Initial purchase failed for user=${userId}: ${reason}`);
        }
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