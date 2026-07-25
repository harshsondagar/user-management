import { Controller, Get } from "@nestjs/common";
import { DiskHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from "@nestjs/terminus";
import { RedisHealthIndicator } from "./redis.health";
import { Public } from "../decorator/public-decoretor";



@Controller('health')

export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly db: TypeOrmHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly disk: DiskHealthIndicator,
        private readonly redis: RedisHealthIndicator
    ) { }

    @Public()
    @Get()
    @HealthCheck()
    check() {
        try {

            return this.health.check([
                () => this.db.pingCheck('database'),
                () => this.redis.isHealthy('redis'),
                () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
                () => this.disk.checkStorage('check_storage', { path: '/', thresholdPercent: 0.9 }),
            ])

        } catch (err: any) {
            console.log('RAW DISK CHECK ERROR:', JSON.stringify(err.response ?? err, null, 2));
        }
    }
}