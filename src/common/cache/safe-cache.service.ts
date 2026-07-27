import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Cache } from "cache-manager"



@Injectable()
export class SafeCacheService {
    private readonly logger = new Logger(SafeCacheService.name)

    constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) { }

    async get<T>(key: string): Promise<T | null> {
        try {
            return (await this.cache.get<T>(key)) ?? null
        } catch (error) {
            this.logger.warn(`cache GET failed for key "${key}" : ${(error as Error).message} `)
            return null
        }
    }

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        try {
            await this.cache.set(key, value, ttl)
        } catch (error) {
            this.logger.warn(`cache SET failed for key "${key}" : ${(error as Error).message} `)
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.cache.del(key)
        } catch (error) {
            this.logger.warn(`cache DEL failed for key "${key}" : ${(error as Error).message} `)
        }
    }
}