import { Injectable } from "@nestjs/common";
import { RedisService } from '@app/redis';

@Injectable()
export class SafeCacheService {
    constructor(private readonly redis: RedisService) { }

    async get<T>(key: string): Promise<T | null> {
        return this.redis.getJSON<T>(key);
    }

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        return this.redis.setJSON(key, value, ttl);
    }

    async del(key: string): Promise<void> {
        return this.redis.del(key);
    }
}