import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/node';
import { SettlementService } from '../service/settlement.service';


@Injectable()
export class SettlementCron {
    private readonly logger = new Logger(SettlementCron.name);

    constructor(private readonly settlementService: SettlementService) { }

    @Cron(CronExpression.EVERY_10_SECONDS, { name: 'monthly-settlement', timeZone: 'UTC' })
    async runMonthlySettlement(): Promise<void> {
        const monthStart = this.getPreviousMonthStart();
        this.logger.log(`Starting monthly settlement for ${monthStart.toISOString().slice(0, 7)}`);

        try {
            const run = await this.settlementService.settleMonth(monthStart);
            this.logger.log(
                `Settlement complete for ${monthStart.toISOString().slice(0, 7)}: ` +
                `status=${run.status} gross=${run.grossCollectedCents} platform=${run.platformShareCents} pool=${run.creatorPoolCents}`,
            );
        } catch (err) {

            this.logger.error(`Monthly settlement FAILED for ${monthStart.toISOString().slice(0, 7)}`, (err as Error).stack);
            Sentry.captureException(err, {
                tags: { context: 'monthly-settlement' },
                extra: { monthStart: monthStart.toISOString() },
            });
        }
    }

    private getPreviousMonthStart(): Date {
        const now = new Date();

        const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        firstOfThisMonth.setUTCMonth(firstOfThisMonth.getUTCMonth() - 1);
        return firstOfThisMonth;
    }
}