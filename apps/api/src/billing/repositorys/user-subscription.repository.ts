import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { SubscriptionStatus, UserSubscription } from "../entities/user-subscription-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


@Injectable()
export class UserSubscriptionRepository extends BaseRepository<UserSubscription> {
    constructor(@InjectRepository(UserSubscription) repository: Repository<UserSubscription>) {
        super(repository)
    }

    async findExpiringActive() {
        return this.repository
            .createQueryBuilder('us')
            .innerJoinAndSelect('us.plan', 'plan')
            .where('us.status = :status', { status: SubscriptionStatus.ACTIVE })
            .andWhere('us.currentPeriodEnd <= :now', { now: new Date() })
            .andWhere('plan.stripePriceId IS NOT NULL') // excludes free plan rows
            .getMany();
    }

    async findExpiringSoon(withinDays: number) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + withinDays);

        return this.repository
            .createQueryBuilder('us')
            .innerJoinAndSelect('us.plan', 'plan')
            .where('us.status = :status', { status: SubscriptionStatus.ACTIVE })
            .andWhere('us.currentPeriodEnd > :now', { now: new Date() })
            .andWhere('us.currentPeriodEnd <= :threshold', { threshold })
            .andWhere('plan.stripePriceId IS NOT NULL')
            .getMany();
    }

    async transitionToNewPlan(
        userId: string,
        newPlanId: string,
        opts: { stripeSubscriptionId: string | null; currentPeriodEnd: Date },
    ): Promise<UserSubscription> {
        return this.repository.manager.transaction(async (manager) => {
            await manager
                .createQueryBuilder()
                .update(UserSubscription)
                .set({ status: SubscriptionStatus.CANCELED, canceledAt: new Date() })
                .where('userId = :userId AND status = :status', { userId, status: SubscriptionStatus.ACTIVE })
                .execute();

            const insertResult = await manager
                .createQueryBuilder()
                .insert()
                .into(UserSubscription)
                .values({
                    userId,
                    planId: newPlanId,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: opts.currentPeriodEnd,
                })
                .returning('*')
                .execute();

            return insertResult.raw[0] as UserSubscription;
        });
    }
}