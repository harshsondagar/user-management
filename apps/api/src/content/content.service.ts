import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from './repository/content-repository';
import { ProfilesService } from '../profile/profile.service';
import { Content } from './entity/conetnt-entity';
import { EpisodeRepository } from './repository/episode.repository';

export interface PlaybackInfo {
    videoUrl: string;
    durationSeconds: number | null;
}

@Injectable()
export class ContentService {
    constructor(
        private readonly contentRepository: ContentRepository,
        private readonly profilesService: ProfilesService,
        private readonly episodeRepo: EpisodeRepository,
    ) { }

    async browseForProfile(
        userId: string,
        profileId: string,
        page: number,
        limit: number,
    ): Promise<{ items: Content[]; total: number; page: number; limit: number }> {
        const profile = await this.profilesService.findOneForUser(userId, profileId);
        const { items, total } = await this.contentRepository.browse(
            profile.maturityLevel,
            page,
            limit,
        );
        return { items, total, page, limit };
    }

    async getDetailForProfile(
        userId: string,
        profileId: string,
        contentId: string,
    ): Promise<Content> {
        const profile = await this.profilesService.findOneForUser(userId, profileId);
        const content = await this.contentRepository.getDetailForProfile(
            contentId,
            profile.maturityLevel,
        );


        if (!content) {
            throw new NotFoundException('Content not found');
        }
        return content;
    }


    async getMoviePlaybackInfo(
        userId: string,
        profileId: string,
        contentId: string,
    ): Promise<PlaybackInfo> {
        await this.profilesService.findOneForUser(userId, profileId);

        const content = await this.contentRepository.findOne({ where: { id: contentId } });
        if (!content || !content.videoUrl) {
            throw new NotFoundException('Content not found');
        }
        return { videoUrl: content.videoUrl, durationSeconds: content.durationSeconds! };
    }

    async getEpisodePlaybackInfo(
        userId: string,
        profileId: string,
        episodeId: string,
    ): Promise<PlaybackInfo> {
        await this.profilesService.findOneForUser(userId, profileId);

        const episode = await this.episodeRepo.findOne({ where: { id: episodeId } });
        if (!episode) {
            throw new NotFoundException('Episode not found');
        }
        return { videoUrl: episode.videoUrl, durationSeconds: episode.durationSeconds };
    }
}