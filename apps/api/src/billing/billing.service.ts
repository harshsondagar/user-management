import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import Stripe from "stripe";
import { User } from "../user/entity/user-entity";
import { UserRepository } from "../user/user.repository";
import { PlanRepository } from "./repositorys/plan.repository";
import { UserSubscriptionRepository } from "./repositorys/user-subscription.repository";
import { SubscriptionStatus } from "./entities/user-subscription-entity";
import { RenewalTokenRepository } from "./repositorys/renewal-token.repository";
import { Repository } from "typeorm";
import { Organization } from "../organization/entities/organization-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { OrganizationSubscription } from "../organization/entities/organization-subsciription-entity";
import { PlanScope } from "./entities/plan-entity";


@Injectable()
export class BillingService {
    constructor(
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
        private readonly userRepo: UserRepository,
        private readonly planRepo: PlanRepository,
        private readonly subRepo: UserSubscriptionRepository,
        private readonly renewalTokenRepo: RenewalTokenRepository,
        @InjectRepository(Organization) private readonly organizationRepo: Repository<Organization>,
        @InjectRepository(OrganizationSubscription) private readonly orgSubRepo: Repository<OrganizationSubscription>,
    ) { }

    async createPaymentIntentForPlan(
        ownerType: 'user' | 'organization',
        ownerId: string,
        planId: string,
        user: User
    ): Promise<{
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


        if (chosenPlan.scope !== PlanScope.INDIVIDUAL) {
            throw new BadRequestException('This plan is only available for organizations.');
        }


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
                    ownerType,
                    ownerId,
                    planId: chosenPlan.id,
                    type: 'initial_purchase',
                }
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

    async createPaymentIntentForOrgPlan(organizationId: string, planId: string): Promise<{
        clientSecret: string;
        amount: number;
        currency: string;
        planName: string;
    }> {
        const chosenPlan = await this.planRepo.findOne({ where: { id: planId, isActive: true } });

        if (!chosenPlan) {
            throw new NotFoundException(`Plan with ID ${planId} does not exist`);
        }

        if (chosenPlan.scope !== PlanScope.ORGANIZATION) {
            throw new BadRequestException('This plan is only available for individual accounts.');
        }

        const activeSub = await this.orgSubRepo.findOne({
            where: { organizationId, status: SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });

        if (activeSub) {
            if (chosenPlan.rank <= activeSub.plan.rank) {
                throw new ConflictException(
                    chosenPlan.rank === activeSub.plan.rank
                        ? `This organization already has an active ${chosenPlan.name} subscription.`
                        : `Already on ${activeSub.plan.name}. Downgrades aren't available via checkout.`,
                );
            }
        }

        const customerId = await this.resolveOrgStripeCustomerId(organizationId);

        const paymentIntent = await this.stripe.paymentIntents.create(
            {
                amount: chosenPlan.amount,
                currency: chosenPlan.currency,
                customer: customerId,
                payment_method_types: ['card', 'upi'],
                metadata: {
                    organizationId,
                    planId: chosenPlan.id,
                    type: 'initial_purchase',
                    scope: 'organization',
                },
            },
            { idempotencyKey: `org-checkout:${organizationId}:${chosenPlan.id}:${Date.now()}` },
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

    private async resolveOrgStripeCustomerId(organizationId: string): Promise<string> {
        const organization = await this.organizationRepo.findOneBy({ id: organizationId });
        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        if (organization.stripeCustomerId) {
            return organization.stripeCustomerId;
        }

        const customer = await this.stripe.customers.create({
            name: organization.organizationName,
            metadata: { organizationId },
        });

        await this.organizationRepo.update(organizationId, { stripeCustomerId: customer.id });
        return customer.id;
    }

    async renewViaToken(token: string): Promise<{ clientSecret: string | null; status: string }> {
        const renewalToken = await this.renewalTokenRepo.consume(token);
        if (!renewalToken) {
            throw new BadRequestException('This renewal link is invalid, expired, or already used.');
        }

        try {
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

            // requires_action (3DS) and succeeded/processing are all legitimate in-progress
            // states — the client still needs the clientSecret to finish the flow, so keep
            // the token consumed. Only a hard failure state should release it.
            if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
                await this.renewalTokenRepo.release(renewalToken.id);
            }

            return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status };
        } catch (err) {
            // Any thrown error (Stripe API error, network failure, no card on file, etc.)
            // means no successful charge attempt was made — release the token so the
            // same link can be retried.
            await this.renewalTokenRepo.release(renewalToken.id);
            throw err;
        }

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

    async listPurchasableOrgPlans(organizationId: string) {
        const plans = await this.planRepo.findAll({ where: { isActive: true } });

        const activeSub = await this.orgSubRepo.findOne({
            where: { organizationId, status: SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });
        const currentRank = activeSub?.plan.rank ?? 0;

        return plans
            .filter((p) => p.amount > 0 && p.scope === PlanScope.ORGANIZATION)
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


}