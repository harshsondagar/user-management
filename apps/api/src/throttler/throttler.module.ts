import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";
import { getRedisClientToken } from "@app/redis";

@Module({
    imports: [
        ThrottlerModule.forRootAsync({
            inject: [getRedisClientToken('cache')],
            useFactory: (redisClient: Redis) => ({
                throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
                storage: new ThrottlerStorageRedisService(redisClient),
            }),
        }),
    ],
    providers: [],
    exports: [],
})
export class AppThrottleModule { }