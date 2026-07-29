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

            const password = config.get<string>('redis.password');
            const host = config.get<string>('redis.host', 'localhost');
            const port = config.get<number>('redis.port', 6379);
            const db = config.get<number>('REDIS_DB', 0);


            const redisClient = new Redis({
                host,
                port,
                db,
            });

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


