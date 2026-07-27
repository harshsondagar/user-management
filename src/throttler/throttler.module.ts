import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler"
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis"
import Redis from "ioredis";


@Module({
    imports: [ThrottlerModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
            const redisClient = new Redis();

            redisClient.on('error', (err) => {
                Logger.error(`Throttler Redis connection error: ${err.message}`, err.stack, 'ThrottlerRedis');
            });

            return {
                throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
                storage: new ThrottlerStorageRedisService(redisClient),
            };
        },
    })],
    providers: [],
    exports: []
})

export class AppThrottleModule {

}


