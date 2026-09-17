import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { BaseRepository } from '../../common/repository/base.repository';
import { RenewalToken } from '../entities/renewalToken-entity';

@Injectable()
export class RenewalTokenRepository extends BaseRepository<RenewalToken> {
    constructor(@InjectRepository(RenewalToken) repository: Repository<RenewalToken>) {
        super(repository);
    }

    async generate(userId: string, userSubscriptionId: string, ttlDays = 7): Promise<string> {
        const token = randomBytes(32).toString('hex'); // 64 char, unguessable
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);

        await this.repository.insert({ userId, userSubscriptionId, token, expiresAt, usedAt: null });
        return token;
    }

    /** Atomically consumes the token if valid — returns null if invalid/expired/already used. */
    async consume(token: string): Promise<RenewalToken | null> {
        const result = await this.repository
            .createQueryBuilder()
            .update(RenewalToken)
            .set({ usedAt: () => 'now()' })
            .where('token = :token', { token })
            .andWhere('usedAt IS NULL')
            .andWhere('expiresAt > now()')
            .returning('*')
            .execute();

        return (result.raw[0] as RenewalToken) ?? null;
    }
}