import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '@app/redis';

@Injectable()
export class RedisHealthIndicator {
    constructor(
        private readonly cache: RedisService,
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
