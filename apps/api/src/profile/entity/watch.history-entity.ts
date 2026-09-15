import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Check,
} from 'typeorm';
import { Profile } from './profile-entity';
import { Content } from './conetnt-entity';
import { Episode } from './Episode-entity';
/**
 * Exactly one of (content_id, episode_id) is set per row:
 *   - content_id -> a MOVIE's own progress
 *   - episode_id -> progress on one episode of a SERIES
 * A CHECK constraint enforces this in the DB, not just in application
 * code, so a bug can't silently create a dangling/ambiguous row.
 *
 * "Continue Watching" for a series is derived by joining episode_id ->
 * episodes -> seasons -> content and taking the most recent row per
 * series (GROUP BY series_id ORDER BY last_watched_at DESC), not by
 * storing series-level progress directly.
 */
@Entity('watch_history')
@Check(
    'chk_watch_history_exactly_one_target',
    `("content_id" IS NOT NULL AND "episode_id" IS NULL) OR ("content_id" IS NULL AND "episode_id" IS NOT NULL)`,
)
export class WatchHistory {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_watch_history_profile_id')
    @Column({ name: 'profile_id', type: 'uuid' })
    profileId!: string;

    @ManyToOne(() => Profile, (profile) => profile.watchHistory, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'profile_id' })
    profile!: Profile;

    @Column({ name: 'content_id', type: 'uuid', nullable: true })
    contentId?: string | null; // set for MOVIE progress

    @ManyToOne(() => Content, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'content_id' })
    content?: Content | null;

    @Column({ name: 'episode_id', type: 'uuid', nullable: true })
    episodeId?: string | null; // set for SERIES episode progress

    @ManyToOne(() => Episode, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'episode_id' })
    episode?: Episode | null;

    @Column({ name: 'progress_seconds', type: 'integer', default: 0 })
    progressSeconds!: number;

    @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
    durationSeconds?: number | null;

    @Column({ name: 'completed', type: 'boolean', default: false })
    completed!: boolean;

    @Column({ name: 'last_watched_at', type: 'timestamptz' })
    lastWatchedAt!: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    // Partial unique indexes (added in migration, not expressible cleanly
    // via decorator options across all TypeORM versions):
    //   UNIQUE (profile_id, content_id) WHERE content_id IS NOT NULL
    //   UNIQUE (profile_id, episode_id) WHERE episode_id IS NOT NULL
}