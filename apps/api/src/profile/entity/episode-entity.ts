import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Index,
    Unique,
} from 'typeorm';
import { Season } from './season-entity';

/**
 * `video_url` points at a CDN/HLS manifest (e.g. an S3 + CloudFront URL
 * or a signed streaming URL), never a raw file this API serves itself.
 * Actual upload/transcoding is a separate pipeline (out of scope here) -
 * this row is written only once you have a final playable URL.
 */
@Entity('episodes')
@Unique('uq_episodes_season_id_episode_number', ['seasonId', 'episodeNumber'])
export class Episode {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_episodes_season_id')
    @Column({ name: 'season_id', type: 'uuid' })
    seasonId!: string;

    @ManyToOne(() => Season, (season) => season.episodes, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'season_id' })
    season!: Season;

    @Column({ name: 'episode_number', type: 'smallint' })
    episodeNumber!: number;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    synopsis?: string | null;

    @Column({ name: 'duration_seconds', type: 'integer' })
    durationSeconds!: number;

    @Column({ name: 'video_url', type: 'text' })
    videoUrl!: string;

    @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
    thumbnailUrl?: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}