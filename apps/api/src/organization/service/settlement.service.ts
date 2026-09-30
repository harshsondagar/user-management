import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LedgerService } from './ledger.service';
import { Payment, PaymentKind, PaymentStatus } from '../../billing/entities/payment-entity';
import { SettlementRun, SettlementStatus } from "../entities/settlemennt.run-entity"
import { SettlementLine } from '../entities/settlement.line-entity';
import { WatchStat } from '../entities/watch-stat-entity';


function allocateByLargestRemainder(
    totalCents: number,
    weights: { key: string; weight: number }[],
): Map<string, number> {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const result = new Map<string, number>();

    if (totalWeight === 0 || weights.length === 0) return result;

    const raw = weights.map((w) => {
        const exact = (totalCents * w.weight) / totalWeight;
        const floor = Math.floor(exact);
        return { key: w.key, floor, remainder: exact - floor };
    });

    let allocated = raw.reduce((sum, r) => sum + r.floor, 0);
    let remaining = totalCents - allocated;

    // Give the leftover cents to the largest remainders first
    raw.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < raw.length && remaining > 0; i++) {
        raw[i].floor += 1;
        remaining -= 1;
    }

    for (const r of raw) result.set(r.key, r.floor);
    return result;
}

@Injectable()
export class SettlementService {
    private readonly logger = new Logger(SettlementService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly ledgerService: LedgerService,
    ) { }

    /**
     * Settle a single calendar month. `monthStart` must be the first day of the month, UTC,
     * at midnight (e.g. new Date('2026-08-01T00:00:00Z')). Idempotent at the run level:
     * SettlementRun.periodStart is UNIQUE, so calling this twice for the same month either
     * no-ops (if already POSTED) or resumes from CALCULATED (if it crashed after calculating
     * but before posting) rather than double-counting.
     */
    async settleMonth(monthStart: Date): Promise<SettlementRun> {
        const monthEnd = new Date(monthStart);
        monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

        return this.dataSource.transaction(async (manager) => {
            let run = await this.getOrCreateRun(manager, monthStart, monthEnd);

            console.log(run);


            if (run.status === SettlementStatus.POSTED) {
                this.logger.log(`Month ${monthStart.toISOString()} already settled (run ${run.id}), skipping`);
                return run;
            }

            if (run.status === SettlementStatus.DRAFT) {
                run = await this.calculate(manager, run, monthStart, monthEnd);
            }

            // DEBUG — remove once the numbers check out
            const debugLines = await manager.getRepository(SettlementLine).find({ where: { settlementRunId: run.id } });
            this.logger.warn(`DEBUG run: creatorPoolCents=${run.creatorPoolCents} platformShareCents=${run.platformShareCents}`);
            this.logger.warn(`DEBUG lines: ${JSON.stringify(debugLines.map(l => ({ org: l.organizationId, amount: l.amountCents })))}`);
            this.logger.warn(`DEBUG lines sum: ${debugLines.reduce((s, l) => s + l.amountCents, 0)}`);

            // run.status is now CALCULATED (or was already, if resuming after a crash)
            run = await this.post(manager, run);

            await this.ledgerService.assertBalancedToZero(manager);
            return run;
        });
    }

    private async getOrCreateRun(manager: EntityManager, monthStart: Date, monthEnd: Date): Promise<SettlementRun> {
        const repo = manager.getRepository(SettlementRun);
        const existing = await repo.findOne({ where: { periodStart: monthStart.toISOString().slice(0, 10) as any } });
        if (existing) return existing;

        return repo.save(
            repo.create({
                periodStart: monthStart.toISOString().slice(0, 10) as any,
                periodEnd: monthEnd.toISOString().slice(0, 10) as any,
                status: SettlementStatus.DRAFT,
            }),
        );
    }

    private async calculate(
        manager: EntityManager,
        run: SettlementRun,
        monthStart: Date,
        monthEnd: Date,
    ): Promise<SettlementRun> {
        const paymentRepo = manager.getRepository(Payment);

        // Only successful (or now-refunded-but-was-successful — refundedCents already reflects
        // that) USER_SUBSCRIPTION payments feed the pool. ORG_SUBSCRIPTION (Enterprise fees) never do.
        const { grossCents, platformCents, poolCents } = await paymentRepo
            .createQueryBuilder('p')
            .select('COALESCE(SUM(p.amountCents), 0)', 'grossCents')
            .addSelect('COALESCE(SUM(p.platformShareCents), 0)', 'platformCents')
            .addSelect('COALESCE(SUM(p.creatorPoolShareCents), 0)', 'poolCents')
            .where('p.kind = :kind', { kind: PaymentKind.USER_SUBSCRIPTION })
            .andWhere('p.status IN (:...statuses)', {
                statuses: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
            })
            .andWhere('p.settlementRunId IS NULL') // never double-settle a payment
            .andWhere('p.paidAt >= :start AND p.paidAt < :end', { start: monthStart, end: monthEnd })
            .getRawOne();

        const watchRows: { organizationId: string; seconds: string }[] = await manager
            .getRepository(WatchStat)
            .createQueryBuilder('w')
            .select('w.organizationId', 'organizationId')
            .addSelect('SUM(w.seconds)', 'seconds')
            .where('w.countsForEarnings = true')
            .andWhere('w.day >= :start AND w.day < :end', {
                start: monthStart.toISOString().slice(0, 10),
                end: monthEnd.toISOString().slice(0, 10),
            })
            .groupBy('w.organizationId')
            .getRawMany();

        const totalWatchSeconds = watchRows.reduce((sum, r) => sum + Number(r.seconds), 0);
        const poolCentsNum = Number(poolCents);

        const allocation = allocateByLargestRemainder(
            poolCentsNum,
            watchRows.map((r) => ({ key: r.organizationId, weight: Number(r.seconds) })),
        );

        const lineRepo = manager.getRepository(SettlementLine);
        await lineRepo.delete({ settlementRunId: run.id }); // in case this is a re-calculate after a partial failure

        for (const row of watchRows) {
            const seconds = Number(row.seconds);
            await lineRepo.save(
                lineRepo.create({
                    settlementRunId: run.id,
                    organizationId: row.organizationId,
                    watchSeconds: seconds,
                    shareRatio: totalWatchSeconds > 0 ? (seconds / totalWatchSeconds).toFixed(10) : '0',
                    amountCents: allocation.get(row.organizationId) ?? 0,
                }),
            );
        }

        console.log({
            runId: run.id,
            poolCentsNum,
            allocationMapSize: allocation.size,
            allocationEntries: [...allocation.entries()]
        });

        // Sanity check before moving on: lines must sum EXACTLY to the pool.
        const lineSum = [...allocation.values()].reduce((a, b) => a + b, 0);
        if (lineSum !== poolCentsNum) {
            throw new Error(
                `Settlement allocation mismatch for ${run.id}: lines sum to ${lineSum}, pool is ${poolCentsNum}`,
            );
        }

        await manager.getRepository(SettlementRun).update(run.id, {
            status: SettlementStatus.CALCULATED,
            grossCollectedCents: Number(grossCents),
            platformShareCents: Number(platformCents),
            creatorPoolCents: poolCentsNum,
            totalWatchSeconds,
        });

        return manager.getRepository(SettlementRun).findOneByOrFail({ id: run.id });
    }

    private async post(manager: EntityManager, run: SettlementRun): Promise<SettlementRun> {
        const lines = await manager.getRepository(SettlementLine).find({ where: { settlementRunId: run.id } });

        if (run.platformShareCents === 0 && run.creatorPoolCents === 0) {
            this.logger.log(`Settlement run ${run.id} (${run.periodStart}) has zero revenue — nothing to post`);
            await manager.getRepository(SettlementRun).update(run.id, {
                status: SettlementStatus.POSTED,
                postedAt: new Date(),
                ledgerTransferIds: [],
            });
            return manager.getRepository(SettlementRun).findOneByOrFail({ id: run.id });
        }

        const { platformTransferId, poolFundingTransferId, lineTransferIds } = await this.ledgerService.postSettlementRun(manager, {
            platformShareCents: run.platformShareCents,
            creatorPoolCents: run.creatorPoolCents, // NEW: funds the pool before allocating it to orgs
            lines: lines.filter((l) => l.amountCents > 0).map((l) => ({ organizationId: l.organizationId, amountCents: l.amountCents })),
        });

        for (const line of lines) {
            const transferId = lineTransferIds[line.organizationId];
            if (transferId) {
                await manager.getRepository(SettlementLine).update(line.id, { ledgerTransferId: transferId });
            }
        }

        // Mark every payment that fed this run as settled, so it's excluded from future runs.
        await manager
            .getRepository(Payment)
            .createQueryBuilder()
            .update()
            .set({ settlementRunId: run.id, ledgerRecordedAt: new Date() })
            .where('kind = :kind', { kind: PaymentKind.USER_SUBSCRIPTION })
            .andWhere('settlementRunId IS NULL')
            .andWhere('paidAt >= :start AND paidAt < :end', {
                start: new Date(run.periodStart),
                end: new Date(run.periodEnd),
            })
            .execute();

        await manager.getRepository(SettlementRun).update(run.id, {
            status: SettlementStatus.POSTED,
            postedAt: new Date(),
            ledgerTransferIds: [
                ...(platformTransferId ? [platformTransferId] : []),
                ...(poolFundingTransferId ? [poolFundingTransferId] : []),
                ...Object.values(lineTransferIds),
            ],
        });

        return manager.getRepository(SettlementRun).findOneByOrFail({ id: run.id });
    }
}


