import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { StripeWebhookRepository } from '../billing/repositorys/stripe-webhook.repository';
import {
    SubscriptionStatus,
    UserSubscription,
} from '../billing/entities/user-subscription-entity';
import {
    Payment,
    PaymentStatus,
    PaymentKind,
} from '../billing/entities/payment-entity';
import * as Sentry from '@sentry/node';
import { UserSubscriptionRepository } from '../billing/repositorys/user-subscription.repository';
import { PaymentRepository } from '../billing/repositorys/payment.repository';
import { UserRepository } from '../user/user.repository';
import { MailProducer } from '../mail/mail-producer';
import { OrganizationSubscription } from '../organization/entities/organization-subsciription-entity';
import { LedgerService } from '../organization/service/ledger.service';
import { BillingService } from '../billing/billing.service';

export interface StripeJobData {
    eventId: string;
    eventType: string;
    data: any;
}

const DAYS_PER_CYCLE = 30;
const PLATFORM_SHARE_BPS = 2000;

/** platform takes the rounding remainder so platform + pool ALWAYS === amountCents exactly */
function splitUserPayment(amountCents: number) {
    const platform = Math.round((amountCents * PLATFORM_SHARE_BPS) / 10000);
    return {
        platformShareCents: platform,
        creatorPoolShareCents: amountCents - platform,
    };
}

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
        private readonly ledgerService: LedgerService,
        private readonly billing: BillingService
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { eventId, eventType, data } = job.data as StripeJobData;

        // NOTE: this check-then-act is only safe under concurrency:1 WITHIN A SINGLE
        // WORKER PROCESS. If you ever run multiple instances of this worker, use
        // `jobId: eventId` when enqueuing (queue.add(name, data, { jobId: eventId }))
        // so BullMQ itself refuses to enqueue a duplicate job for the same Stripe event,
        // independent of how many worker processes are consuming the queue.
        const current = await this.webhookEventRepo.findOne({
            where: { stripeEventId: eventId },
        });
        if (current?.processedAt) {
            this.logger.log(
                `Event ${eventId} already processed at ${current.processedAt.toISOString()} - skipping`,
            );
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

                if (purchaseType === 'initial_purchase' || purchaseType === 'renewal') {
                    try {
                        await this.billing.enqueueReceiptByIntent(data.id);
                    } catch (err) {
                        this.logger.error(
                            `Receipt enqueue failed for intent ${data.id}: ${(err as Error).message}`,
                            (err as Error).stack,
                        );
                    }
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

        await this.webhookEventRepo.updateBy(
            { stripeEventId: eventId },
            { processedAt: new Date() },
        );
    }

    private async handleOrgInitialPurchaseSucceeded(pi: any) {
        const organizationId = pi.metadata?.organizationId;
        const planId = pi.metadata?.planId;

        if (!organizationId || !planId) {
            this.logger.error(
                `payment_intent.succeeded (initial_purchase, organization) missing metadata: pi=${pi.id}`,
            );
            return;
        }

        const periodStart = new Date();
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

            await this.ledgerService.ensureOrgAccounts(organizationId, manager);

            // Org/Enterprise fee = 100% platform revenue. Not split with the creator pool.
            await paymentRepo.save(
                paymentRepo.create({
                    kind: PaymentKind.ORG_SUBSCRIPTION,
                    organizationId,
                    organizationSubscriptionId: newSubscription.id,
                    stripePaymentIntentId: pi.id, // was stripeInvoiceId — wrong field, and left stripePaymentIntentId unset -> NOT NULL violation
                    amountCents: pi.amount, // was `amount` — column no longer exists post-merge
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    platformShareCents: pi.amount,
                    creatorPoolShareCents: 0,
                    periodStart,
                    periodEnd,
                    paidAt: new Date(),
                }),
            );
        });
    }

    private async handleUserInitialPurchaseSucceeded(pi: any) {
        const ownerId = pi.metadata?.ownerId;
        const planId = pi.metadata?.planId;
        console.log(ownerId, planId);

        if (!ownerId || !planId) {
            this.logger.error(
                `payment_intent.succeeded (initial_purchase, individual) missing metadata: pi=${pi.id}`,
            );
            return;
        }

        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        const { platformShareCents, creatorPoolShareCents } = splitUserPayment(
            pi.amount,
        );

        await this.dataSource.transaction(async (manager) => {
            const subRepo = manager.getRepository(UserSubscription);
            const paymentRepo = manager.getRepository(Payment);

            await subRepo.update(
                { userId: ownerId, status: SubscriptionStatus.ACTIVE },
                { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
            );

            const newSubscription = await subRepo.save(
                subRepo.create({
                    userId: ownerId,
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: periodEnd,
                }),
            );

            await paymentRepo.save(
                paymentRepo.create({
                    kind: PaymentKind.USER_SUBSCRIPTION,
                    userId: ownerId,
                    userSubscriptionId: newSubscription.id,
                    stripePaymentIntentId: pi.id,
                    amountCents: pi.amount,
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    platformShareCents,
                    creatorPoolShareCents,
                    periodStart,
                    periodEnd,
                    paidAt: new Date(),
                }),
            );
        });
    }

    private async handleRenewalSucceeded(pi: any) {
        const { userSubscriptionId } = pi.metadata;
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + DAYS_PER_CYCLE);

        const { platformShareCents, creatorPoolShareCents } = splitUserPayment(
            pi.amount,
        );

        await this.dataSource.transaction(async (manager) => {
            const subRepo = manager.getRepository(UserSubscription);
            const paymentRepo = manager.getRepository(Payment);

            await subRepo.update(userSubscriptionId, {
                currentPeriodEnd: periodEnd,
                status: SubscriptionStatus.ACTIVE,
            });

            await paymentRepo.save(
                paymentRepo.create({
                    kind: PaymentKind.USER_SUBSCRIPTION,
                    subscriptionId: userSubscriptionId,
                    userSubscriptionId,
                    stripePaymentIntentId: pi.id, // was stripeInvoiceId — same fix as above
                    amountCents: pi.amount, // this one already used amountCents, kept
                    currency: pi.currency,
                    status: PaymentStatus.SUCCEEDED,
                    platformShareCents,
                    creatorPoolShareCents,
                    periodStart,
                    periodEnd,
                    paidAt: new Date(),
                }),
            );
        });
    }

    private async handlePaymentFailed(pi: any) {
        const userId = pi.metadata?.userId;
        const type = pi.metadata?.type;

        if (!userId) {
            this.logger.warn(
                `payment_intent.payment_failed with no userId metadata: pi=${pi.id}`,
            );
            return;
        }

        // OPEN QUESTION (see chat): no Payment row is ever created at PENDING time in this
        // flow, so a failure currently leaves ZERO trace in the payments table — only this
        // log line and an email. If you want failed attempts auditable, insert a Payment
        // row here with status FAILED, e.g.:
        //
        // await this.paymentRepo.save(
        //  this.paymentRepo.create({
        //   kind: type === 'renewal' ? PaymentKind.USER_SUBSCRIPTION : PaymentKind.USER_SUBSCRIPTION,
        //   userId,
        //   stripePaymentIntentId: pi.id,
        //   amountCents: pi.amount,
        //   currency: pi.currency,
        //   status: PaymentStatus.FAILED,
        //   failureReason: pi.last_payment_error?.message ?? 'unknown',
        // })
        // );

        const user = await this.userRepo.findOneById(userId);
        const reason =
            pi.last_payment_error?.message ?? 'Your payment could not be completed.';

        if (type === 'renewal') {
            await this.mailProducer.addPaymentFailedMailJob(
                user.email,
                user.email.split('@')[0],
                reason,
            );
        } else if (type === 'initial_purchase') {
            this.logger.warn(`Initial purchase failed for user=${userId}: ${reason}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(
            `Stripe event job FAILED: eventId=${job.data?.eventId} type=${job.data?.eventType} attempt=${job.attemptsMade}/${job.opts.attempts}`,
            error.stack,
        );
        Sentry.captureException(error, {
            tags: {
                context: 'stripe-webhook-processing',
                eventId: job.data?.eventId,
                eventType: job.data?.eventType,
            },
            extra: { jobData: job.data },
        });
    }
}
