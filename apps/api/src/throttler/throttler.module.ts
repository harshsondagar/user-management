import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler"
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis"
import Redis from "ioredis";
import { testEnv } from "@app/shared";


const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
const tEnv = isTestEnv ? testEnv() : null;

@Module({
    imports: [ThrottlerModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
            // const host = config.get<string>('redis.host', 'localhost');
            // const port = config.get<number>('redis.port', 6379);

            // const db = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : config.get<number>('redis.db', 0);

            // const redisClient = new Redis({
            //     host,
            //     port,
            //     db,
            // });

            const host = tEnv?.redisHost ?? config.get<string>('redis.host', 'localhost');
            const port = tEnv ? tEnv.redisPort : config.get<number>('redis.port', 6379);
            const db = tEnv ? tEnv.redisDb : (process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : config.get<number>('redis.db', 0));

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


