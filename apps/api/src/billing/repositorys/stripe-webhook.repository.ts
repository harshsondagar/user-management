import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repository/base.repository';
import { StripeWebhookEvent } from '../entities/stripe-webhook-event-entity';

@Injectable()
export class StripeWebhookRepository extends BaseRepository<StripeWebhookEvent> {
    constructor(@InjectRepository(StripeWebhookEvent) repository: Repository<StripeWebhookEvent>) {
        super(repository);
    }

    async insertIfNew(stripeEventId: string, type: string, payload: any): Promise<boolean> {
        try {
            await this.repository.insert({ stripeEventId, type, payload, processedAt: null });
            return true;
        } catch (err) {
            if (err instanceof QueryFailedError && (err.driverError as any)?.code === '23505') {
                return false;
            }
            throw err;
        }
    }
}