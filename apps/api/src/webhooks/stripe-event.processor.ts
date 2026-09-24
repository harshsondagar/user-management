import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import { StripeWebhookRepository } from "../billing/repositorys/stripe-webhook.repository";
import { SubscriptionStatus, UserSubscription } from "../billing/entities/user-subscription-entity";
import { Payment, PaymentStatus } from "../billing/entities/payment-entity";
import * as Sentry from '@sentry/node';
import { UserSubscriptionRepository } from "../billing/repositorys/user-subscription.repository";
import { PaymentRepository } from "../billing/repositorys/payment.repository";
import { UserRepository } from "../user/user.repository";
import { MailProducer } from "../mail/mail-producer";
import { OrganizationSubscription } from "../organization/entities/organization-subsciription-entity";

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

        const current = await this.webhookEventRepo.findOne({ where: { stripeEventId: eventId } });
        if (current?.processedAt) {
            this.logger.log(`Event ${eventId} already processed at ${current.processedAt.toISOString()} - skipping`);
            return;
        }

        switch (eventType) {
            case 'payment_intent.succeeded': {

                const scope = data.metadata?.scope ?? 'individual';
                const purchaseType = data.metadata?.type;

                if (purchaseType === 'initial_purchase') {
                    if (scope === 'organization') {
                        await this.handleOrgInitialPurchaseSucceeded(data);
                    } else {
                        await this.handleUserInitialPurchaseSucceeded(data);
                    }
                }
                if (purchaseType === 'renewal') {
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

        await this.webhookEventRepo.updateBy({ stripeEventId: eventId }, { processedAt: new Date() });
    }

    private async handleOrgInitialPurchaseSucceeded(pi: any) {
        const organizationId = pi.metadata?.organizationId;
        const planId = pi.metadata?.planId;

        if (!organizationId || !planId) {
            this.logger.error(`payment_intent.succeeded (initial_purchase, organization) missing metadata: pi=${pi.id}`);
            return;
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        await this.dataSource.transaction(async (manager) => {
            const orgSubRepo = manager.getRepository(OrganizationSubscription);
            const paymentRepo = manager.getRepository(Payment);

            await orgSubRepo.update(
                { organizationId, status: SubscriptionStatus.ACTIVE },
                { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
            );

            const newSubscription = await orgSubRepo.save(
                orgSubRepo.create({
                    organizationId,
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: periodEnd,
                }),
            );

            await paymentRepo.save(
                paymentRepo.create({
                    organizationSubscriptionId: newSubscription.id,
                    stripeInvoiceId: pi.id,
                    amount: pi.amount,
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    paidAt: new Date(),
                }),
            );
        });


    }

    private async handleUserInitialPurchaseSucceeded(pi: any) {
        const userId = pi.metadata?.userId;
        const planId = pi.metadata?.planId;

        if (!userId || !planId) {
            this.logger.error(`payment_intent.succeeded (initial_purchase, individual) missing metadata: pi=${pi.id}`);
            return;
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);


        await this.dataSource.transaction(async (manager) => {
            const subRepo = manager.getRepository(UserSubscription);
            const paymentRepo = manager.getRepository(Payment);

            await subRepo.update(
                { userId, status: SubscriptionStatus.ACTIVE },
                { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
            );

            const newSubscription = await subRepo.save(
                subRepo.create({
                    userId,
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: periodEnd,
                }),
            );

            await paymentRepo.save(
                paymentRepo.create({
                    userSubscriptionId: newSubscription.id,
                    stripeInvoiceId: pi.id,
                    amount: pi.amount,
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    paidAt: new Date(),
                }),
            );
        });

    }

    private async handleRenewalSucceeded(pi: any) {
        const { userSubscriptionId } = pi.metadata;
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        await this.dataSource.transaction(async (manager) => {
            const subRepo = manager.getRepository(UserSubscription);
            const paymentRepo = manager.getRepository(Payment);

            await subRepo.update(userSubscriptionId, {
                currentPeriodEnd: periodEnd,
                status: SubscriptionStatus.ACTIVE,
            });

            await paymentRepo.save(
                paymentRepo.create({
                    userSubscriptionId,
                    stripeInvoiceId: pi.id,
                    amount: pi.amount,
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    paidAt: new Date(),
                }),
            );
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