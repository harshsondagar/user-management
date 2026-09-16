import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
    Unique,
} from 'typeorm';
import { User } from '../../user/entity/user-entity';
import { WatchHistory } from '../../watch-history/entity/watch.history-entity';
import { WatchlistItem } from '../../watch-list/entity/watchlist.items-entity';

export enum MaturityLevel {
    KIDS = 1,
    OLDER_KIDS = 2,
    TEEN = 3,
    MATURE_TEEN = 4,
    ADULT = 5,
}

@Entity('profiles')
@Unique('uq_profiles_user_id_profile_name', ['userId', 'profileName'])
export class Profile {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_profiles_user_id')
    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, (user) => user.profiles, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'profile_name', type: 'varchar', length: 50 })
    profileName!: string;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl?: string | null;

    @Column({ name: 'is_kids_profile', type: 'boolean', default: false })
    isKidsProfile!: boolean;

    @Column({
        name: 'maturity_level',
        type: 'smallint',
        default: MaturityLevel.ADULT,
    })
    maturityLevel!: MaturityLevel;

    @Column({ name: 'language', type: 'varchar', length: 10, default: 'en' })
    language!: string;

    @Column({
        name: 'subtitle_language',
        type: 'varchar',
        length: 10,
        nullable: true,
    })
    subtitleLanguage?: string | null;

    @Column({ name: 'ui_theme', type: 'varchar', length: 20, default: 'dark' })
    uiTheme!: string;

    @Column({ name: 'pin_hash', type: 'varchar', nullable: true, select: false })
    pinHash?: string | null;

    @Column({ name: 'pin_enabled', type: 'boolean', default: false })
    pinEnabled!: boolean;

    @Column({ name: 'pin_failed_attempts', type: 'smallint', default: 0 })
    pinFailedAttempts!: number;

    @Column({ name: 'pin_locked_until', type: 'timestamptz', nullable: true })
    pinLockedUntil?: Date | null;

    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault!: boolean;

    @OneToMany(() => WatchHistory, (wh) => wh.profile)
    watchHistory!: WatchHistory[];

    @OneToMany(() => WatchlistItem, (wl) => wl.profile)
    watchlist!: WatchlistItem[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date | null;
}
