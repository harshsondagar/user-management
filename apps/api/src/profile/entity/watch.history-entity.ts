import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Unique,
} from 'typeorm';
import { Profile } from './profile-entity';


@Entity('watch_history')
@Unique('uq_watch_history_profile_content', ['profileId', 'contentId'])
export class WatchHistory {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_watch_history_profile_id')
    @Column({ name: 'profile_id', type: 'uuid' })
    profileId!: string;

    @ManyToOne(() => Profile, (profile) => profile.watchHistory, {
        onDelete: 'CASCADE', // deleting a profile wipes its history, not siblings'
        nullable: false,
    })
    @JoinColumn({ name: 'profile_id' })
    profile!: Profile;

    // References your content/catalog table (not modeled here). Kept as a
    // plain uuid FK-less column if content lives in a separate bounded
    // context/service; add a real FK if it's in the same DB.
    @Column({ name: 'content_id', type: 'uuid' })
    contentId!: string;

    @Column({ name: 'progress_seconds', type: 'integer', default: 0 })
    progressSeconds!: number;

    @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
    durationSeconds!: number | null;

    @Column({ name: 'completed', type: 'boolean', default: false })
    completed!: boolean;

    @Column({ name: 'last_watched_at', type: 'timestamptz' })
    lastWatchedAt!: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}