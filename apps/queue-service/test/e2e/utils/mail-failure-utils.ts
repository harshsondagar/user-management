import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailFailureService } from '../../../src/mail/mail-failure.service';
import { MailFailure } from '../../../src/mail/entity/mail-failure-entity';

export function getMailFailureService(app: INestApplication): MailFailureService {
    return app.get(MailFailureService);
}

export function getMailFailureRepo(app: INestApplication): Repository<MailFailure> {
    return app.get<Repository<MailFailure>>(getRepositoryToken(MailFailure));
}

export async function seedMailFailure(
    app: INestApplication,
    overrides: Partial<{
        jobName: string;
        recipientEmail: string;
        bullJobId: string;
        errorMessage: string;
        attemptsMade: number;
        jobData: Record<string, any>;
    }> = {},
) {
    await getMailFailureService(app).record({
        jobName: overrides.jobName ?? 'welcome',
        recipientEmail: overrides.recipientEmail ?? 'test@example.com',
        bullJobId: overrides.bullJobId ?? 'job-1',
        errorMessage: overrides.errorMessage ?? 'simulated failure',
        attemptsMade: overrides.attemptsMade ?? 1,
        jobData: overrides.jobData,
    });
}