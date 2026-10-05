import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistItem } from '../../watch-list/entity/watchlist.items-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class WatchlistRepository extends BaseRepository<WatchlistItem> {
    constructor(@InjectRepository(WatchlistItem) repository: Repository<WatchlistItem>) {
        super(repository);
    }

    async addIdempotent(profileId: string, contentId: string): Promise<void> {
        await this.repository
            .createQueryBuilder()
            .insert()
            .into(WatchlistItem)
            .values({ profileId, contentId })
            .orIgnore()
            .execute();
    }

    async removeIdempotent(profileId: string, contentId: string): Promise<void> {
        await this.repository.delete({ profileId, contentId });
    }

    async listForProfile(profileId: string): Promise<WatchlistItem[]> {
        return this.repository.find({
            where: { profileId },
            relations: { content: true },
            order: { addedAt: 'DESC' },
        });
    }
}