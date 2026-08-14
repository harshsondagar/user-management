import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DlqService } from '../../../src/dlq/dlq.service';
import { DeadLetterEntry } from '../../../src/dlq/entity/dead-letter-entry-entity';

export function getDlqService(app: INestApplication): DlqService {
    return app.get(DlqService);
}

export function getDlqRepo(app: INestApplication): Repository<DeadLetterEntry> {
    return app.get<Repository<DeadLetterEntry>>(getRepositoryToken(DeadLetterEntry));
}

/** Seeds a DLQ entry through the real service method — same path production failures take. */
export async function seedPendingResourceFailure(
    app: INestApplication,
    overrides: Partial<{
        resourceId: string;
        nid: number;
        title: string;
        query: string;
        errorMessage: string;
    }> = {},
) {
    const dlqService = getDlqService(app);
    return dlqService.recordResourceFailure({
        resourceId: overrides.resourceId ?? 'res-123',
        nid: overrides.nid ?? 1,
        title: overrides.title ?? 'Test Resource',
        query: overrides.query ?? 'test query',
        errorMessage: overrides.errorMessage ?? 'simulated upstream failure',
    });
}

export async function findDlqEntry(app: INestApplication, id: string) {
    return getDlqRepo(app).findOne({ where: { id } });
}