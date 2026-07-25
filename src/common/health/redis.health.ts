import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class RedisHealthIndicator {
    constructor(
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly healthIndicatorService: HealthIndicatorService,
    ) { }

    async isHealthy(key: string) {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const testKey = '__health_check__';
            await this.cache.set(testKey, 'ok', 5000);
            const value = await this.cache.get(testKey);

            if (value !== 'ok') {
                return indicator.down({ message: 'redis returned  unexpected value' });
            }

            return indicator.up();
        } catch (error) {
            return indicator.down({ message: (error as Error).message });
        }
    }
}
