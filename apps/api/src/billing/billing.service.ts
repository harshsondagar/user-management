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

        if (chosenPlan.amount == null || chosenPlan.amount <= 0) {
            throw new BadRequestException('Free plans cannot be purchased via checkout.');
        }


        // ...same upgrade/downgrade rank check as before, unchanged...
        const activeSub = await this.subRepo.findOne({
            where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });

        if (activeSub) {
            if (chosenPlan.rank <= activeSub.plan.rank) {
                throw new ConflictException(
                    chosenPlan.rank === activeSub.plan.rank
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
                payment_method_types: ['card', 'upi'],
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


        const paymentIntent = await this.stripe.paymentIntents.create(
            {
                amount: plan.amount!,
                currency: plan.currency,
                customer: user.stripeCustomerId,
                payment_method: savedMethod.id,
                payment_method_types: ['card'],
                confirm: true,
                return_url: `${process.env.APP_URL}/checkout.html`,
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

    async listPurchasablePlans(user: User) {
        const plans = await this.planRepo.findAll({ where: { isActive: true } });

        const activeSub = await this.subRepo.findOne({
            where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });
        const currentRank = activeSub?.plan.rank ?? 0;

        return plans
            .filter((p) => p.amount > 0)
            .sort((a, b) => a.rank - b.rank)
            .map((p) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                amount: p.amount,
                currency: p.currency,
                rank: p.rank,
                isCurrent: p.rank === currentRank,
                isDowngrade: p.rank < currentRank,
            }));
    }

    async subscriptionHistory(user: User, params: { page: number, pageSize: number, status?: string }) {
        let where: any = {}
        if (params.status) where.status = params.status as SubscriptionStatus
        // if (user.id) where.userId = user.id
        const sanitizedPage = Math.max(1, params.page || 1);
        const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

        const [history, total] = await this.subRepo.findAndCount({
            where,
            select: ['id', 'userId', 'planId', 'status', 'createdAt', 'canceledAt', 'graceStartedAt', 'currentPeriodEnd', 'updatedAt'],
            order: { createdAt: 'ASC', id: 'ASC' },
            skip: (sanitizedPage - 1) * pageSize,
            take: pageSize,
        })

        const totalPages = Math.max(Math.ceil(total / pageSize), 1);
        const hasNextPage = sanitizedPage < totalPages;
        const hasPreviousPage = sanitizedPage > 1;

        return { history, total, sanitizedPage, pageSize, totalPages, hasNextPage, hasPreviousPage };

    }

}