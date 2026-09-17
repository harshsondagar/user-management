import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { UserSubscriptionRepository } from "../billing/repositorys/user-subscription.repository";
import { PlanRepository } from "../billing/repositorys/plan.repository";
import { RenewalTokenRepository } from "../billing/repositorys/renewal-token.repository";
import { UserRepository } from "../user/user.repository";
import { MailProducer } from "../mail/mail-producer";
import Stripe from "stripe"


@Injectable()
export class SubscriptionExpiryJob {
    private readonly logger = new Logger(SubscriptionExpiryJob.name);

    constructor(
        private readonly subRepo: UserSubscriptionRepository,
        private readonly planRepo: PlanRepository,
        private readonly renewalTokenRepo: RenewalTokenRepository,
        private readonly userRepo: UserRepository,
        private readonly mailProducer: MailProducer,
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    ) { }

    @Cron(CronExpression.EVERY_HOUR) // swap to EVERY_15_MINUTES for tighter granularity
    async run() {

        const expiring = await this.subRepo.findExpiringActive();

        this.logger.log(`subscription-expiry sweep: ${expiring.length} subscription(s) to process`);

        for (const sub of expiring) {
            try {
                await this.processOne(sub);
            } catch (error) {
                // Isolated per-user — one failure doesn't block the rest of the batch,
                // and there's no BullMQ retry here since this isn't a queue job — next
                // hourly run will just pick this row up again (it's still "expiring").
                this.logger.error(
                    `Failed processing subscription expiry for userId=${sub.userId} subId=${sub.id}`,
                    (error as Error).stack,
                );
            }
        }
    }

    private async processOne(sub: any): Promise<void> {
        const plan = await this.planRepo.findOneById(sub.planId);
        const user = await this.userRepo.findOneById(sub.userId);

        const paymentMethods = await this.stripe.paymentMethods.list({ customer: user.stripeCustomerId!, type: 'card' });


        if (plan.gracePeriodDays > 0 && !sub.graceStartedAt) {

            const graceEnd = new Date(sub.currentPeriodEnd!);
            graceEnd.setDate(graceEnd.getDate() + plan.gracePeriodDays);

            await this.subRepo.update(sub.id, { currentPeriodEnd: graceEnd, graceStartedAt: new Date() });

            if (paymentMethods.data.length > 0) {
                // existing one-click renewal token flow
                const token = await this.renewalTokenRepo.generate(sub.userId, sub.id);
                const renewalUrl = `${process.env.API_URL}/checkout.html?token=${token}`;
                await this.mailProducer.addRenewalFinalNoticeMailJob(
                    user.email,
                    user.email.split('@')[0],
                    renewalUrl,
                    graceEnd,
                );
            } else {
                const checkoutUrl = `${process.env.API_URL}/checkout.html?planId=${sub.planId}`;
                await this.mailProducer.addRenewalFinalNoticeMailJob(
                    user.email,
                    user.email.split('@')[0],
                    checkoutUrl,
                    graceEnd,
                );
            }
            return
        }

        const freePlan = await this.planRepo.findOne({ where: { code: 'free' } });
        await this.subRepo.transitionToNewPlan(sub.userId, freePlan!.id, {
            stripeSubscriptionId: null,
            currentPeriodEnd: new Date('9999-12-31'),
        });

        await this.mailProducer.addDowngradedToFreeMailJob(user.email, user.email.split('@')[0])

    }
}