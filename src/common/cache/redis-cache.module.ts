import { CacheModule } from "@nestjs/cache-manager";
import { Logger, Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";
import { SafeCacheService } from "./safe-cache.service";


@Module({
    imports: [CacheModule.registerAsync({
        isGlobal: true,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => {
            const store = await redisStore({
                socket: {
                    host: config.get<string>('redis.host', 'localhost'),
                    port: config.get<number>('redis.port', 6379)
                },
                // password: config.get<string>('redis.password'),
                ttl: 60 * 1000
            })

            store.client?.on('error', (err) => {
                Logger.error(`Redis client error: ${err.message}`, err.stack, 'RedisCache');
            })

            return { store }
        }
    })],
    exports: [CacheModule, SafeCacheService],
    providers: [SafeCacheService]
})


export class RedisCacheModule {

}