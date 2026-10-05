import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchHistory } from '../entity/watch.history-entity';
import { BaseRepository } from '../../common/repository/base.repository';

export interface ContinueWatchingRow {
    watch_history_id: string;
    progress_seconds: number;
    duration_seconds: number | null;
    completed: boolean;
    last_watched_at: Date;
    content_id: string;
    content_title: string;
    content_type: 'MOVIE' | 'SERIES';
    poster_url: string | null;
    episode_id: string | null;
    episode_title: string | null;
    episode_number: number | null;
    season_number: number | null;
}

@Injectable()
export class WatchHistoryRepository extends BaseRepository<WatchHistory> {
    constructor(
        @InjectRepository(WatchHistory) repository: Repository<WatchHistory>,
    ) {
        super(repository);
    }

    async upsertMovieProgress(
        profileId: string,
        contentId: string,
        data: {
            progressSeconds: number;
            durationSeconds: number | null;
            completed: boolean;
        },
    ): Promise<void> {
        await this.repository
            .createQueryBuilder()
            .insert()
            .into(WatchHistory)
            .values({
                profileId,
                contentId,
                episodeId: null,
                progressSeconds: data.progressSeconds,
                durationSeconds: data.durationSeconds,
                completed: data.completed,
                lastWatchedAt: new Date(),
            })
            .orUpdate(
                [
                    'progress_seconds',
                    'duration_seconds',
                    'completed',
                    'last_watched_at',
                    'updated_at',
                ],
                ['profile_id', 'content_id'],
                { indexPredicate: '"content_id" IS NOT NULL' },
            )
            .execute();
    }

    async upsertEpisodeProgress(
        profileId: string,
        episodeId: string,
        data: {
            progressSeconds: number;
            durationSeconds: number | null;
            completed: boolean;
        },
    ): Promise<void> {
        await this.repository
            .createQueryBuilder()
            .insert()
            .into(WatchHistory)
            .values({
                profileId,
                contentId: null,
                episodeId,
                progressSeconds: data.progressSeconds,
                durationSeconds: data.durationSeconds,
                completed: data.completed,
                lastWatchedAt: new Date(),
            })
            .orUpdate(
                [
                    'progress_seconds',
                    'duration_seconds',
                    'completed',
                    'last_watched_at',
                    'updated_at',
                ],
                ['profile_id', 'episode_id'],
                { indexPredicate: '"episode_id" IS NOT NULL' },
            )
            .execute();
    }

    async removeMovieProgress(
        profileId: string,
        contentId: string,
    ): Promise<void> {
        await this.repository.delete({ profileId, contentId });
    }

    async removeEpisodeProgress(
        profileId: string,
        episodeId: string,
    ): Promise<void> {
        await this.repository.delete({ profileId, episodeId });
    }

    async getContinueWatching(
        profileId: string,
        limit = 20,
    ): Promise<ContinueWatchingRow[]> {
        return this.repository.query(
            `
      (
        SELECT
          wh.id AS watch_history_id,
          wh.progress_seconds,
          wh.duration_seconds,
          wh.completed,
          wh.last_watched_at,
          c.id AS content_id,
          c.title AS content_title,
          c.type AS content_type,
          c.poster_url,
          NULL::uuid AS episode_id,
          NULL::varchar AS episode_title,
          NULL::smallint AS episode_number,
          NULL::smallint AS season_number
        FROM watch_history wh
        JOIN content c ON c.id = wh.content_id
        WHERE wh.profile_id = $1 AND wh.content_id IS NOT NULL AND wh.completed = false
      )
      UNION ALL
      (
        SELECT DISTINCT ON (c.id)
          wh.id AS watch_history_id,
          wh.progress_seconds,
          wh.duration_seconds,
          wh.completed,
          wh.last_watched_at,
          c.id AS content_id,
          c.title AS content_title,
          c.type AS content_type,
          c.poster_url,
          e.id AS episode_id,
          e.title AS episode_title,
          e.episode_number,
          s.season_number
        FROM watch_history wh
        JOIN episodes e ON e.id = wh.episode_id
        JOIN seasons s ON s.id = e.season_id
        JOIN content c ON c.id = s.series_id
        WHERE wh.profile_id = $1 AND wh.episode_id IS NOT NULL AND wh.completed = false
        ORDER BY c.id, wh.last_watched_at DESC
      )
      ORDER BY last_watched_at DESC
      LIMIT $2
      `,
            [profileId, limit],
        );
    }
}
