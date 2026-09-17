import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '../../billing/entities/user-subscription-entity';
import { UserSubscriptionRepository } from '../../billing/repositorys/user-subscription.repository';
import { PlanRepository } from '../../billing/repositorys/plan.repository';

@Injectable()
export class SubscriptionsService {
    constructor(
        private readonly subscriptionRepo: UserSubscriptionRepository,
        private readonly planRepo: PlanRepository,
    ) { }

    async hasActivePaidSubscription(userId: string): Promise<boolean> {
        const subscription = await this.subscriptionRepo.findOne({
            where: { userId, status: SubscriptionStatus.ACTIVE },
            order: { currentPeriodEnd: 'DESC' },
        });
        if (!subscription) return false;

        const plan = await this.planRepo.findOne({ where: { id: subscription.planId } });
        if (!plan || plan.code === 'free') return false;

        const cutoff = new Date(subscription.currentPeriodEnd!);
        cutoff.setDate(cutoff.getDate() + (plan.gracePeriodDays ?? 0));

        return new Date() <= cutoff;
    }
}