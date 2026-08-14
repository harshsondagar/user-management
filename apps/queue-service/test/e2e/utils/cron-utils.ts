// queue-service/test/e2e/utils/cron-utils.ts
import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

export function disableCronJobs(app: INestApplication) {
    const registry = app.get(SchedulerRegistry);
    for (const [, job] of registry.getCronJobs()) {
        job.stop();
    }
}