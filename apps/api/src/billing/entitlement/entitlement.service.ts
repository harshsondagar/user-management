import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserSubscriptionRepository } from '../repositorys/user-subscription.repository';
import { FeatureRepository } from '../repositorys/feature.repository';
import { UsageRepository } from '../repositorys/usage.repository';
import { DateTime } from 'luxon';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

export interface EntitlementCheckResult {
    allowed: boolean;
    limit: number;
    used: number;
    remaining: number;
    periodEnd: Date;
    periodStart: Date;
    redisKey: string;
}

type Period = 'daily' | 'monthly' | 'lifetime';

const USAGE_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 and tonumber(ARGV[2]) > 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return {0, tonumber(ARGV[1])}
end
return {1, current}
`;

@Injectable()
export class EntitlementService implements OnModuleInit {
    private readonly logger = new Logger(EntitlementService.name);

    constructor(
        private readonly subRepo: UserSubscriptionRepository,
        private readonly featureRepo: FeatureRepository,
        private readonly usageRepo: UsageRepository,
        @InjectRedis() private readonly redis: Redis,
    ) { }

    onModuleInit() {
        this.redis.defineCommand('usageIncr', { numberOfKeys: 1, lua: USAGE_LUA });
    }

    private async getActiveEntitlement(userId: string, featureKey: string) {
        const row = await this.subRepo
            .createQueryBuilder('us')
            .innerJoin('us.plan', 'p')
            .innerJoin('p.entitlements', 'pe')
            .innerJoin('pe.feature', 'f')
            .innerJoin('us.user', 'u')
            .select([
                'pe.valueLimit AS "valueLimit"',
                'pe.period AS period',
                'u.timezone AS timezone',
                'f.id AS "featureId"',
            ])
            .where('us.userId = :userId', { userId })
            .andWhere('us.status = :status', { status: 'active' })
            .andWhere('f.key = :featureKey', { featureKey })
            .getRawOne();

        return row ?? null;
    }

    async checkAndConsume(userId: string, featureKey: string): Promise<EntitlementCheckResult> {
        const entitlement = await this.getActiveEntitlement(userId, featureKey);
        if (!entitlement) {
            throw new HttpException('No active plan entitlement found', HttpStatus.PAYMENT_REQUIRED);
        }

        const { valueLimit: limit, period, timezone, featureId } = entitlement;
        const { start, end } = this.computeWindow(timezone, period);

        const periodKey =
            period === 'daily' ? DateTime.fromJSDate(start).toFormat('yyyy-LL-dd') :
                period === 'monthly' ? DateTime.fromJSDate(start).toFormat('yyyy-LL') : 'lifetime';
        const redisKey = `usage:${userId}:${featureId}:${periodKey}`;
        const ttlSeconds = period === 'lifetime' ? 0 : Math.max(1, Math.ceil((end.getTime() - Date.now()) / 1000));

        const [allowedFlag, used] = (await (this.redis as any).usageIncr(redisKey, limit, ttlSeconds)) as [number, number];

        if (allowedFlag === 0) {
            return { allowed: false, used, limit, remaining: 0, periodEnd: end, periodStart: start, redisKey };
        }

        // Fire-and-forget mirror — Redis is already source of truth, this is reporting/audit only.
        this.syncToPostgres(userId, featureId, start, end, used).catch((err) => {
            this.logger.error(`usage_counter mirror failed for user=${userId} feature=${featureId}`, err);
        });

        return { allowed: true, used, limit, remaining: limit - used, periodEnd: end, periodStart: start, redisKey };
    }

    private computeWindow(timezone: string, period: Period): { start: Date; end: Date } {
        const now = DateTime.now().setZone(timezone || 'UTC');
        if (period === 'daily') {
            const start = now.startOf('day');
            return { start: start.toUTC().toJSDate(), end: start.plus({ days: 1 }).toUTC().toJSDate() };
        }
        if (period === 'monthly') {
            const start = now.startOf('month');
            return { start: start.toUTC().toJSDate(), end: start.plus({ months: 1 }).toUTC().toJSDate() };
        }
        return {
            start: DateTime.fromISO('1970-01-01T00:00:00Z').toJSDate(),
            end: DateTime.fromISO('9999-12-31T00:00:00Z').toJSDate(),
        };
    }

    private async syncToPostgres(userId: string, featureId: string, periodStart: Date, periodEnd: Date, count: number) {
        await this.usageRepo.upsert(
            { userId, featureId, periodStart, periodEnd, count },
            ['userId', 'featureId', 'periodStart'],
        );
    }

    async release(redisKey: string): Promise<void> {
        await this.redis.decr(redisKey);
    }
}