import { Controller, Get } from "@nestjs/common";
import { DiskHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from "@nestjs/terminus";
import { RedisHealthIndicator } from "./redis.health";
import { Public } from "../decorator/public-decoretor";
import { SkipThrottle } from "@nestjs/throttler";



@Controller('health')

export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly db: TypeOrmHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly disk: DiskHealthIndicator,
        private readonly redis: RedisHealthIndicator
    ) { }

    @SkipThrottle()
    @Public()
    @Get()
    @HealthCheck()
    check() {
        const heapThreshold = process.env.NODE_ENV === 'test'
            ? 600 * 1024 * 1024  // more headroom for parallel test workers
            : 300 * 1024 * 1024;

        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.redis.isHealthy('redis'),

            () => this.memory.checkHeap('memory_heap', heapThreshold),
            () => this.disk.checkStorage('check_storage', { path: '/', thresholdPercent: 0.9 }),
        ])
    }
}