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

export enum ContentAccessType {
    FREE = 'free',
    PREMIUM = 'premium',
}

export enum ContentStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived', // Use this to hide it from everyone
}


@Entity('content')
export class Content {
    @PrimaryColumn('uuid')
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

    @Column({ name: 'video_url', type: 'text', nullable: true })
    videoUrl?: string | null

    @Column({
        type: 'enum',
        enum: ContentAccessType,
        default: ContentAccessType.PREMIUM,
    })
    accessType!: ContentAccessType;

    @OneToMany(() => Season, (season) => season.series)
    seasons!: Season[]; // SERIES only

    @Column({
        type: 'enum',
        enum: ContentStatus,
        default: ContentStatus.DRAFT, // Safer to default to draft until an admin publishes it
    })
    status!: ContentStatus

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date | null;
}