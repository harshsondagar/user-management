import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { UserSubscriptionRepository } from "../billing/repositorys/user-subscription.repository";
import { PlanRepository } from "../billing/repositorys/plan.repository";
import { PaymentRepository } from "../billing/repositorys/payment.repository";
import { StripeWebhookRepository } from "../billing/repositorys/stripe-webhook.repository";
import { Job } from "bullmq";
import { SubscriptionStatus } from "../billing/entities/user-subscription-entity";
import { PaymentStatus } from "../billing/entities/payment-entity";

export interface StripeJobData {
    eventId: string;
    eventType: string;
    data: any;
}



@Injectable()
@Processor('stripe-events', { concurrency: 1 })
export class StripeEventProcessor extends WorkerHost {

    constructor(
        private readonly subRepo: UserSubscriptionRepository,
        private readonly planRepo: PlanRepository,
        private readonly paymentRepo: PaymentRepository,
        private readonly webhookEventRepo: StripeWebhookRepository,
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { eventId, eventType, data } = job.data as StripeJobData

        switch (eventType) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(data);
                break;
            case 'invoice.paid':
                await this.handleInvoicePaid(data);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(data);
                break;
            default:
                // not every event type needs handling — safe to ignore unknowns
                break;

        }

        await this.webhookEventRepo.updateBy({ stripeEventId: eventId }, { processedAt: new Date() });
    }

    private async handleCheckoutCompleted(session: any) {
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) return;

        await this.subRepo.updateBy(
            { userId, status: SubscriptionStatus.ACTIVE },
            { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        );

        await this.subRepo.create({
            userId,
            planId,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: session.subscription,
        })
    }

    private async handleInvoicePaid(invoice: any) {
        const subscription = await this.subRepo.findOne({ where: { stripeSubscriptionId: invoice.subscription } });
        if (!subscription) return;

        await this.paymentRepo.create({
            userSubscriptionId: subscription.id,
            stripeInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date(),
        })

        await this.subRepo.update(subscription.id, {
            currentPeriodEnd: new Date(invoice.lines.data[0]?.period?.end * 1000),
        });
    }

    private async handleSubscriptionDeleted(subscription: any) {
        await this.subRepo.updateBy(
            { stripeSubscriptionId: subscription.id },
            { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        );
    }

}