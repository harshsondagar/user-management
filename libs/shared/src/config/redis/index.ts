// libs/shared/src/config/redis.config.ts

import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

export function getRedisConnection(
    config: ConfigService,
): ConnectionOptions {
    return {
        host: config.getOrThrow<string>('REDIS_HOST'),
        port: config.getOrThrow<number>('REDIS_PORT'),
    };
}