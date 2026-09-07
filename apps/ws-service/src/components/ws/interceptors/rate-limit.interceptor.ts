import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { TokenBucket } from "../rate-limit/token-bucket";
import { Socket } from "socket.io";
import { WsException } from "@nestjs/websockets";

interface RateLimitConfig {
    capacity: number;
    refillPerSecond: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
    move: { capacity: 20, refillPerSecond: 20 },
    chat: { capacity: 5, refillPerSecond: 1 },
    join_room: { capacity: 3, refillPerSecond: 0.2 },
    ping: { capacity: 2, refillPerSecond: 0.1 }
};


@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    private buckets = new Map<string, Map<string, TokenBucket>>()

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const client = context.switchToWs().getClient<Socket>()
        const event = context.switchToWs().getPattern()

        const limit = LIMITS[event]
        if (!limit) return next.handle()

        if (!this.buckets.get(client.id)) {
            this.buckets.set(client.id, new Map())
        }

        const clientBuckets = this.buckets.get(client.id)!

        if (!clientBuckets.has(event)) {
            clientBuckets.set(event, new TokenBucket(limit.capacity, limit.refillPerSecond))
        }

        const bucket = clientBuckets.get(event)!
        console.log(bucket);

        if (!bucket.tryConsume()) {

            throw new WsException(`Rate limit exceeded for "${event}"`);
        }
        return next.handle();
    }

    clearClient(socketId: string): void {
        this.buckets.delete(socketId);
    }
}