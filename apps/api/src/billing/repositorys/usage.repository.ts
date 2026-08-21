import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { UsageCounter } from "../entities/usage-counter-entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";


export interface ConsumeResult {
    consumed: boolean;
    count: number;
}

@Injectable()
export class UsageRepository extends BaseRepository<UsageCounter> {
    constructor(@InjectRepository(UsageCounter) repository: Repository<UsageCounter>) {
        super(repository)
    }

    async incrementIfUnderLimit(
        userId: string,
        featureId: string,
        periodStart: Date,
        periodEnd: Date,
        limit: number,
    ): Promise<ConsumeResult> {
        const table = this.repository.metadata.tableName;

        const rows: { count: number }[] = await this.repository.manager.query(
            `
        INSERT INTO "${table}" (user_id, feature_id, period_start, period_end, count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (user_id, feature_id, period_start)
        DO UPDATE SET count = "${table}".count + 1
        WHERE "${table}".count < $5
        RETURNING count
        `,
            [userId, featureId, periodStart, periodEnd, limit],
        );

        if (rows.length === 0) {
            const current = await this.repository.findOneBy({
                userId,
                featureId,
                periodStart,
            } as any);
            return { consumed: false, count: current?.count ?? limit };
        }

        return { consumed: true, count: rows[0].count };
    }

    async release(userId: string, featureId: string, periodStart: Date): Promise<void> {
        const table = this.repository.metadata.tableName;
        await this.repository.manager.query(
            `UPDATE "${table}" SET count = GREATEST(count - 1, 0)
                WHERE user_id = $1 AND feature_id = $2 AND period_start = $3`,
            [userId, featureId, periodStart],
        );
    }
}   