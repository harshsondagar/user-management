import { Injectable, Logger } from "@nestjs/common";
import { MailFailure } from "@app/shared"
import { MoreThanOrEqual, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class MailFailureService {
    private readonly logger = new Logger(MailFailureService.name)

    constructor(
        @InjectRepository(MailFailure)
        private readonly repo: Repository<MailFailure>,
    ) { }

    async record(params: {
        jobName: string;
        recipientEmail: string;
        bullJobId: string;
        errorMessage: string;
        attemptsMade: number;
        jobData?: Record<string, any>;
    }) {
        const entry = this.repo.create({
            jobName: params.jobName,
            recipientEmail: params.recipientEmail,
            bullJobId: params.bullJobId,
            errorMessage: params.errorMessage,
            attemptsMade: params.attemptsMade,
            jobData: params.jobData ?? null,
        });
        await this.repo.save(entry);
        this.logger.warn(`Mail permanently failed: ${params.jobName} → ${params.recipientEmail}`);
    }

    async findAll(params: { jobName?: string; page: number; pageSize: number }) {
        const where = params.jobName ? { jobName: params.jobName } : {};
        const [entries, total] = await this.repo.findAndCount({
            where,
            order: { failedAt: 'DESC' },
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize,
        });
        return { entries, total, page: params.page, pageSize: params.pageSize };
    }

    async getStats() {
        const raw = await this.repo
            .createQueryBuilder('mf')
            .select('mf.jobName', 'jobName')
            .addSelect('COUNT(*)', 'count')
            .groupBy('mf.jobName')
            .getRawMany();

        const total = raw.reduce((sum, r) => sum + Number(r.count), 0);
        return { total, byJobName: raw };
    }

    async findRecentByJobName(jobName: string, since: Date) {
        return this.repo.find({
            where: { jobName, failedAt: MoreThanOrEqual(since) },
        });
    }
} 