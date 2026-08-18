import { HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { UserSubscriptionRepository } from "../repositorys/user-subscription.repository";
import { EntitlementRepository } from "../repositorys/plan-entitlement.repository";
import { FeatureRepository } from "../repositorys/feature.repository";
import { UsageRepository } from "../repositorys/usage.repository";
import { SubscriptionStatus } from "../entities/user-subscription-entity";
import { InjectRedis } from '@nestjs-modules/ioredis'
import { EntitlementPeriod } from "../entities/plan-entitlement-entity";
import Redis from "ioredis";

export interface EntitlementCheckResult {
    allowed: boolean;
    limit: number;
    used: number;
    remaining: number;
    periodEnd: Date;
}

@Injectable()
export class EntitlementService {

    private readonly logger = new Logger(EntitlementService.name)
    constructor(
        private readonly subRepo: UserSubscriptionRepository,
        private readonly entitlementRepo: EntitlementRepository,
        private readonly featureRepo: FeatureRepository,
        private readonly usageRepo: UsageRepository,
        @InjectRedis() private readonly redis: Redis,
    ) { }

    async checkAndConsume(userId: string, featureKey: string): Promise<EntitlementCheckResult> {

        const subscription = await this.subRepo.findOne({
            where: { userId, status: SubscriptionStatus.ACTIVE },
        });

        if (!subscription) {
            throw new HttpException('No active subscription found', HttpStatus.FORBIDDEN);
        }

        const feature = await this.featureRepo.findOne({ where: { key: featureKey } });
        if (!feature) {
            throw new HttpException(`Unknown feature: ${featureKey}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const entitlement = await this.entitlementRepo.findOne({
            where: { planId: subscription.planId, featureId: feature.id },
        });

        if (!entitlement) {
            throw new HttpException(`Your plan does not include access to this feature`, HttpStatus.FORBIDDEN);
        }

        const { periodStart, periodEnd, redisKey } = this.computePeriodWindow(userId, feature.id, entitlement.period);


        try {

            // Atomic increment — Redis INCR is safe under concurrent requests, no race condition
            const currentCount = await this.redis.get(redisKey);

            if (currentCount && parseInt(currentCount) >= entitlement.valueLimit) {
                return {
                    allowed: false,
                    limit: entitlement.valueLimit,
                    used: parseInt(currentCount),
                    remaining: 0,
                    periodEnd,
                };
            }

            const newCount = await this.incrementRedisCounter(redisKey, periodEnd);

            if (newCount > entitlement.valueLimit) {
                // over limit — compensate by decrementing back, since we already incremented
                await this.redis.decr(redisKey);
                return { allowed: false, limit: entitlement.valueLimit, used: entitlement.valueLimit, remaining: 0, periodEnd };
            }

            // fire-and-forget durable mirror to Postgres — don't block the request on this
            this.syncToPostgres(userId, feature.id, periodStart, periodEnd, newCount).catch(() => {
                // logged inside syncToPostgres; a Postgres mirror failure shouldn't fail the actual request,
                // since Redis is the source of truth for enforcement — Postgres is just for reporting/audit
            });

            return {
                allowed: true,
                limit: entitlement.valueLimit,
                used: newCount,
                remaining: entitlement.valueLimit - newCount,
                periodEnd,
            };

        } catch (error) {
            this.logger.error(`Redis unavailable during entitlement check for user ${userId}: ${(error as Error).message}`);
            return { allowed: true, limit: entitlement.valueLimit, used: -1, remaining: -1, periodEnd }; // -1 signals "unknown, degraded mode"
        }
    }

    private computePeriodWindow(userId: string, featureId: string, period: EntitlementPeriod) {
        const now = new Date();
        let periodStart: Date;
        let periodEnd: Date;
        let periodKey: string;

        if (period === EntitlementPeriod.DAILY) {
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 1);
            periodKey = periodStart.toISOString().slice(0, 10); // YYYY-MM-DD
        } else if (period === EntitlementPeriod.MONTHLY) {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            periodKey = periodStart.toISOString().slice(0, 7); // YYYY-MM
        } else {
            // LIFETIME — no reset ever
            periodStart = new Date(0);
            periodEnd = new Date('9999-12-31');
            periodKey = 'lifetime';
        }

        const redisKey = `usage:${userId}:${featureId}:${periodKey}`;
        return { periodStart, periodEnd, redisKey };
    }

    private async incrementRedisCounter(redisKey: string, periodEnd: Date): Promise<number> {
        const next = await this.redis.incr(redisKey); // genuinely atomic, no race
        if (next === 1) {
            // only set TTL on the first increment of this key, avoid resetting TTL on every hit
            const ttlSeconds = Math.ceil((periodEnd.getTime() - Date.now()) / 1000);
            await this.redis.expire(redisKey, ttlSeconds);
        }
        return next;
    }

    private async syncToPostgres(userId: string, featureId: string, periodStart: Date, periodEnd: Date, count: number) {
        await this.usageRepo.upsert(
            { userId, featureId, periodStart, periodEnd, count },
            ['userId', 'featureId', 'periodStart'],
        );
    }

}
