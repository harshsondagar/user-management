import { CacheModule } from "@nestjs/cache-manager";
import { Global, Logger, Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SafeCacheService } from "./safe-cache.service";
import { createKeyv } from "@keyv/redis";


@Global()
@Module({
    imports: [CacheModule.registerAsync({
        isGlobal: true,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => {
            const password = config.get<string>('redis.password');
            const host = config.get<string>('redis.host', 'localhost');
            const port = config.get<number>('redis.port', 6379);
            const db = config.get<number>('REDIS_DB', 0);

            const redisUrl = `redis://${host}:${port}/${db}`;


            const keyv = createKeyv(redisUrl);

            keyv.on('error', (err) => {
                Logger.error(`Redis (Keyv) connection error: ${err.message}`, err.stack, 'RedisCache');
            });

            return { stores: [keyv], ttl: 60 * 1000 }
        }
    })],
    exports: [CacheModule, SafeCacheService],
    providers: [SafeCacheService]
})


export class RedisCacheModule {

}