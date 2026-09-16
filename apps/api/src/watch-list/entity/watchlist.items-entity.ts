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
import { Profile } from '../../profile/entity/profile-entity';
import { Content } from '../../profile/entity/conetnt-entity'; // adjust to your actual path

@Entity('watchlist_items')
@Unique('uq_watchlist_profile_content', ['profileId', 'contentId'])
export class WatchlistItem {

    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id!: string;

    @Index('idx_watchlist_profile_id')
    @Column({ name: 'profile_id', type: 'uuid' })
    profileId!: string;

    @ManyToOne(() => Profile, (profile) => profile.watchlist, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'profile_id' })
    profile!: Profile;

    @Column({ name: 'content_id', type: 'uuid' })
    contentId!: string;

    @ManyToOne(() => Content, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'content_id' })
    content!: Content;

    @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
    addedAt!: Date;
}