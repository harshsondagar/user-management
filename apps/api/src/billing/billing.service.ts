import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import Stripe from "stripe";
import { User } from "../user/entity/user-entity";
import { UserRepository } from "../user/user.repository";
import { PlanRepository } from "./repositorys/plan.repository";
import { UserSubscriptionRepository } from "./repositorys/user-subscription.repository";
import { SubscriptionStatus } from "./entities/user-subscription-entity";
import { RenewalTokenRepository } from "./repositorys/renewal-token.repository";


@Injectable()
export class BillingService {
    constructor(
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
        private readonly userRepo: UserRepository,
        private readonly planRepo: PlanRepository,
        private readonly subRepo: UserSubscriptionRepository,
        private readonly renewalTokenRepo: RenewalTokenRepository
    ) { }

    async createPaymentIntentForPlan(user: User, planId: string): Promise<{
        clientSecret: string;
        amount: number;
        currency: string;
        planName: string;
    }> {
        const chosenPlan = await this.planRepo.findOne({ where: { id: planId, isActive: true } });
        if (!chosenPlan) {
            throw new NotFoundException(`Plan with ID ${planId} does not exist`);
        }
        if (!chosenPlan.stripePriceId) {
            throw new BadRequestException('Free plans do not have a Stripe Price ID.');
        }

        // ...same upgrade/downgrade rank check as before, unchanged...
        const activeSub = await this.subRepo.findOne({
            where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });

        if (activeSub) {
            const currentRank = activeSub.plan.code;
            const chosenRank = chosenPlan.code
            if (chosenRank <= currentRank) {
                throw new ConflictException(
                    chosenRank === currentRank
                        ? `You already have an active ${chosenPlan.name} subscription.`
                        : `You're already on ${activeSub.plan.name}. Downgrades aren't available via checkout.`,
                );
            }
        }

        const customerId = await this.resolveStripeCustomerId(user);

        const paymentIntent = await this.stripe.paymentIntents.create(
            {
                amount: chosenPlan.amount!,
                currency: chosenPlan.currency,
                customer: customerId,
                setup_future_usage: 'off_session',
                automatic_payment_methods: { enabled: true, 'allow_redirects': 'never' },
                metadata: {
                    userId: user.id,
                    planId: chosenPlan.id,
                    type: 'initial_purchase', // distinguishes from renewal PaymentIntents in the webhook
                },
            },
            { idempotencyKey: `checkout:${user.id}:${chosenPlan.id}:${Date.now()}` },
        );

        return {
            clientSecret: paymentIntent.client_secret!,
            amount: chosenPlan.amount,
            currency: chosenPlan.currency,
            planName: chosenPlan.name,
        };
    }

    private async resolveStripeCustomerId(user: User): Promise<string> {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const customer = await this.stripe.customers.create({
            email: user.email,
            name: user.email.split('@')[0],
            metadata: { userId: user.id },
        });

        await this.userRepo.update(user.id, { stripeCustomerId: customer.id });
        return customer.id;
    }

    async renewViaToken(token: string): Promise<{ clientSecret: string | null; status: string }> {
        const renewalToken = await this.renewalTokenRepo.consume(token);
        if (!renewalToken) {
            throw new BadRequestException('This renewal link is invalid, expired, or already used.');
        }

        const subscription = await this.subRepo.findOneById(renewalToken.userSubscriptionId);
        const plan = await this.planRepo.findOneById(subscription.planId);
        const user = await this.userRepo.findOneById(renewalToken.userId);

        if (!user.stripeCustomerId) {
            throw new BadRequestException('No payment method on file for this account.');
        }

        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
        });
        const savedMethod = paymentMethods.data[0];
        if (!savedMethod) {
            throw new BadRequestException('No saved card found — please complete a fresh checkout instead.');
        }

        const price = await this.stripe.prices.retrieve(plan.stripePriceId!);

        const paymentIntent = await this.stripe.paymentIntents.create(
            {
                amount: price.unit_amount!,
                currency: price.currency,
                customer: user.stripeCustomerId,
                payment_method: savedMethod.id,
                return_url: `${process.env.API_URL}/billing/renew-complete`,
                metadata: {
                    userId: user.id,
                    planId: plan.id,
                    userSubscriptionId: subscription.id,
                    type: 'renewal',
                },
            },
            { idempotencyKey: `renewal:${renewalToken.id}` },
        );
        return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status };
    }

}