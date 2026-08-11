import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { SafeCacheService } from "../common/cache/safe-cache.service";

@Injectable()
export class ScrapeQuotaService {
    constructor(private readonly cache: SafeCacheService) { }

    private key(userId: string) {
        const today = new Date().toISOString().slice(0, 10);
        return `scrape-quota:${userId}:${today}`;
    }

    async checkAndIncrement(userId: string, dailyLimit = 2): Promise<void> {
        const key = this.key(userId);
        const count = (await this.cache.get<number>(key)) ?? 0;

        if (count >= dailyLimit) {
            throw new HttpException(
                `Daily scrape limit reached (${dailyLimit}/day). Try again tomorrow.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        await this.cache.set(key, count + 1, 60 * 60 * 24);
    }
}