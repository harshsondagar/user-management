import { Injectable } from '@nestjs/common';
import { WatchlistRepository } from './reposetories/watch-list.repo';
import { ProfilesService } from '../profile/profile.service';
import { WatchlistItem } from './entity/watchlist.items-entity';

@Injectable()
export class WatchlistService {
    constructor(
        private readonly watchlistRepository: WatchlistRepository,
        private readonly profilesService: ProfilesService,
    ) { }

    async add(userId: string, profileId: string, contentId: string): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId);
        await this.watchlistRepository.addIdempotent(profileId, contentId);
    }

    async remove(userId: string, profileId: string, contentId: string): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId);
        await this.watchlistRepository.removeIdempotent(profileId, contentId);
    }

    async list(userId: string, profileId: string): Promise<WatchlistItem[]> {
        await this.profilesService.findOneForUser(userId, profileId);
        return this.watchlistRepository.listForProfile(profileId);
    }
}