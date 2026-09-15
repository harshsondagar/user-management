import {
    Entity,
    PrimaryColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from 'typeorm';
import { Season } from './season-entity';

export enum ContentType {
    MOVIE = 'MOVIE',
    SERIES = 'SERIES',
}

/**
 * The root "title" row - a movie OR a series shell. This is what
 * watchlist_items.content_id points to (you bookmark a title, not an
 * episode), and what a MOVIE's own watch_history row points to.
 *
 * `duration_seconds` only applies when type = MOVIE; leave null for
 * SERIES (duration lives per-episode instead). Not DB-enforced with a
 * CHECK because it's a soft convention, not a security boundary - add
 * one later if bad data actually shows up.
 */
@Entity('content')
export class Content {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_content_type')
    @Column({ type: 'enum', enum: ContentType })
    type!: ContentType;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    synopsis?: string | null;

    @Column({ name: 'release_year', type: 'smallint', nullable: true })
    releaseYear?: number | null;

    @Column({ name: 'poster_url', type: 'text', nullable: true })
    posterUrl?: string | null;

    @Column({ name: 'backdrop_url', type: 'text', nullable: true })
    backdropUrl?: string | null;

    // Same 1-5 ordinal scale as profiles.maturity_level, so filtering is:
    // WHERE content.maturity_level <= profile.maturity_level
    @Column({ name: 'maturity_level', type: 'smallint' })
    maturityLevel!: number;

    @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
    durationSeconds?: number | null; // MOVIE only

    @OneToMany(() => Season, (season) => season.series)
    seasons!: Season[]; // SERIES only

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date | null;
}