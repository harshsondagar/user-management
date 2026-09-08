import { Injectable } from "@nestjs/common";
import { TokenBucket } from "./token-bucket";



@Injectable()
export class IpConnectionLimiter {
    private bucket = new Map<string, TokenBucket>();

    private readonly CAPACITY = 10;
    private readonly REFILL_PER_SECOND = 0.5

    allow(ip: string): boolean {
        if (!this.bucket.has(ip)) {
            this.bucket.set(ip, new TokenBucket(this.CAPACITY, this.REFILL_PER_SECOND))
        }
        return this.bucket.get(ip)!.tryConsume()
    }

    cleanup(maxAgeMs = 10 * 60_000): void {
        // TokenBucket would need a `lastRefill` getter for this — see note below
    }

}