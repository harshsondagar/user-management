import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeadLetterEntry, DlqStatus, FailureScope } from './entity/dead-letter-entry-entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

interface RecordResourceFailureParams {
    resourceId: string;
    nid: number;
    title: string;
    query: string;
    errorMessage: string;
    rawContext?: Record<string, any>;
}

interface RecordJobFailureParams {
    bullJobId: string;
    userId?: string;
    query: string;
    errorMessage: string;
    errorStack?: string;
    rawContext?: Record<string, any>;
}

@Injectable()
export class DlqService {
    private readonly logger = new Logger(DlqService.name);

    constructor(
        @InjectRepository(DeadLetterEntry)
        private readonly dlqRepo: Repository<DeadLetterEntry>,
    ) { }

    async recordResourceFailure(params: RecordResourceFailureParams) {
        const existing = await this.dlqRepo.findOne({
            where: { resourceId: params.resourceId, failureScope: FailureScope.RESOURCE }
        })

        if (existing) {
            existing.retryErrorMessage = params.errorMessage;
            existing.attemptCount += 1
            existing.status = DlqStatus.PERMANENTLY_FAILED
            existing.lastAttemptedAt = new Date()
            await this.dlqRepo.save(existing)
            this.logger.warn(`Resource ${params.resourceId} permanently failed after retry`);
            return existing;
        }

        const entry = this.dlqRepo.create({
            failureScope: FailureScope.RESOURCE,
            status: DlqStatus.PENDING_RETRY,
            resourceId: params.resourceId,
            nid: params.nid,
            title: params.title,
            query: params.query,
            errorMessage: params.errorMessage,
            attemptCount: 1,
            lastAttemptedAt: new Date(),
            rawContext: params.rawContext ?? null,
        });
        const saved = await this.dlqRepo.save(entry);
        this.logger.log(`Recorded resource failure in DLQ: ${params.resourceId} (${params.title})`);
        return saved;
    }

    async recordJobFailure(params: RecordJobFailureParams) {

        const existing = await this.dlqRepo.findOne({
            where: { bullJobId: params.bullJobId, failureScope: FailureScope.JOB },
        });

        if (existing) {
            existing.errorMessage = params.errorMessage;
            existing.errorStack = params.errorStack ?? existing.errorStack;
            existing.attemptCount += 1;
            existing.lastAttemptedAt = new Date();
            return this.dlqRepo.save(existing);
        }

        const entry = this.dlqRepo.create({
            failureScope: FailureScope.JOB,
            status: DlqStatus.PERMANENTLY_FAILED,
            bullJobId: params.bullJobId,
            userId: params.userId ?? null,
            query: params.query,
            errorMessage: params.errorMessage,
            errorStack: params.errorStack ?? null,
            attemptCount: 1,
            lastAttemptedAt: new Date(),
            rawContext: params.rawContext ?? null,
        });

        const saved = await this.dlqRepo.save(entry);
        this.logger.error(`Recorded JOB failure in DLQ: job ${params.bullJobId}`);
        return saved;
    }

    async findById(id: string): Promise<DeadLetterEntry> {
        const entry = await this.dlqRepo.findOne({ where: { id } });

        if (!entry) {
            throw new NotFoundException(`DLQ entry ${id} not found`);
        }

        return entry;
    }

    async countByScope(scope: FailureScope): Promise<number> {
        return this.dlqRepo.count({ where: { failureScope: scope } });
    }

    async getPendingRetries(limit = 20): Promise<DeadLetterEntry[]> {
        return this.dlqRepo.find({
            where: { status: DlqStatus.PENDING_RETRY, failureScope: FailureScope.RESOURCE },
            order: { firstFailedAt: 'ASC' },
            take: limit,
        });
    }

    async markResolved(id: string) {
        await this.dlqRepo.update(id, { status: DlqStatus.RESOLVED, resolvedAt: new Date() });
    }

    async markPermanentlyFailed(id: string, retryErrorMessage: string) {
        await this.dlqRepo.update(id, {
            status: DlqStatus.PERMANENTLY_FAILED,
            retryErrorMessage,
            lastAttemptedAt: new Date(),
            attemptCount: () => 'attemptCount + 1',
        });
    }

    async findEntries(params: { scope?: FailureScope; status?: DlqStatus; page: number; pageSize: number }) {
        const where: any = {};
        if (params.scope) where.failureScope = params.scope;
        if (params.status) where.status = params.status;

        const [entries, total] = await this.dlqRepo.findAndCount({
            where,
            select: ['id', 'failureScope', 'status', 'resourceId', 'nid', 'title', 'query', 'bullJobId', 'errorMessage', 'attemptCount', 'firstFailedAt'],
            order: { firstFailedAt: 'DESC' },
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize,
        });
        return { entries, total, page: params.page, pageSize: params.pageSize };
    }

    async markResolvedBy(id: string, adminUserId: string) {
        await this.dlqRepo.update(id, { status: DlqStatus.RESOLVED, resolvedBy: adminUserId, resolvedAt: new Date() });
        return { id, status: 'resolved' };
    }

    async markIgnored(id: string) {
        await this.dlqRepo.update(id, { status: DlqStatus.IGNORED });
        return { id, status: 'ignored' };
    }

    async getStats() {
        const [pendingResource, permanentResource, permanentJob, resolved] = await Promise.all([
            this.dlqRepo.count({ where: { status: DlqStatus.PENDING_RETRY } }),
            this.dlqRepo.count({ where: { status: DlqStatus.PERMANENTLY_FAILED, failureScope: FailureScope.RESOURCE } }),
            this.dlqRepo.count({ where: { status: DlqStatus.PERMANENTLY_FAILED, failureScope: FailureScope.JOB } }),
            this.dlqRepo.count({ where: { status: DlqStatus.RESOLVED } }),
        ]);
        return { pendingResource, permanentResource, permanentJob, resolved };
    }

}
