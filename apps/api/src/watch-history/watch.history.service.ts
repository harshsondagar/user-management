import { Injectable, BadRequestException } from '@nestjs/common';
import { WatchHistoryRepository, ContinueWatchingRow } from "./repositories/watch-history.repo"
import { ProfilesService } from '../profile/profile.service';
import { UpsertProgressDto } from './dto/upsert.progress.dto';


@Injectable()
export class WatchHistoryService {
    constructor(
        private readonly watchHistoryRepository: WatchHistoryRepository,
        private readonly profilesService: ProfilesService,
    ) { }

    async recordMovieProgress(
        userId: string,
        profileId: string,
        contentId: string,
        dto: UpsertProgressDto,
    ): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId); // ownership gate

        if (dto.durationSeconds != null && dto.progressSeconds > dto.durationSeconds) {
            throw new BadRequestException('progressSeconds cannot exceed durationSeconds');
        }

        await this.watchHistoryRepository.upsertMovieProgress(profileId, contentId, {
            progressSeconds: dto.progressSeconds,
            durationSeconds: dto.durationSeconds ?? null,
            completed: dto.completed ?? false,
        });
    }

    async recordEpisodeProgress(
        userId: string,
        profileId: string,
        episodeId: string,
        dto: UpsertProgressDto,
    ): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId);

        if (dto.durationSeconds != null && dto.progressSeconds > dto.durationSeconds) {
            throw new BadRequestException('progressSeconds cannot exceed durationSeconds');
        }

        await this.watchHistoryRepository.upsertEpisodeProgress(profileId, episodeId, {
            progressSeconds: dto.progressSeconds,
            durationSeconds: dto.durationSeconds ?? null,
            completed: dto.completed ?? false,
        });
    }

    async removeMovieProgress(
        userId: string,
        profileId: string,
        contentId: string,
    ): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId);
        await this.watchHistoryRepository.removeMovieProgress(profileId, contentId);
    }

    async removeEpisodeProgress(
        userId: string,
        profileId: string,
        episodeId: string,
    ): Promise<void> {
        await this.profilesService.findOneForUser(userId, profileId);
        await this.watchHistoryRepository.removeEpisodeProgress(profileId, episodeId);
    }

    async getContinueWatching(
        userId: string,
        profileId: string,
    ): Promise<ContinueWatchingRow[]> {
        await this.profilesService.findOneForUser(userId, profileId);
        return this.watchHistoryRepository.getContinueWatching(profileId);
    }
}