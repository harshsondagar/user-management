export class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private readonly capacity: number,
        private readonly refillPerSecond: number,
    ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    tryConsume(cost = 1): boolean {
        this.refill();
        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }

    private refill(): void {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
        this.lastRefill = now;
    }
}