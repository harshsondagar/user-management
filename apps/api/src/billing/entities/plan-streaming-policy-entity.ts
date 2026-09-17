import {
    Entity,
    PrimaryColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan-entity';

export enum VideoQuality {
    SD = 'sd',
    HD = 'hd',
    FULL_HD = 'full_hd',
    UHD_4K = 'uhd_4k',
}

export enum AudioQuality {
    STEREO = 'stereo',
    DOLBY_5_1 = 'dolby_5_1',
    DOLBY_ATMOS = 'dolby_atmos',
}

export enum DeviceType {
    MOBILE = 'mobile',
    TABLET = 'tablet',
    COMPUTER = 'computer',
    SMART_TV = 'smart_tv',
    GAME_CONSOLE = 'game_console',
}

/**
 * One row per Plan. Deliberately NOT folded into PlanEntitlement.config:
 * these fields are a fixed, known set you'll check on every playback
 * request (maxConcurrentStreams, in particular), so they get real
 * typed/enum columns - queryable, indexable, and validated by Postgres
 * itself - instead of untyped JSON keys that can silently drift in
 * shape (see: your own 'audioQuality' being a string in one plan's seed
 * data and an array in another's).
 */
@Entity('plan_streaming_policies')
export class PlanStreamingPolicy {
    @PrimaryColumn('uuid', { name: 'plan_id' })
    planId!: string;

    @OneToOne(() => Plan, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'plan_id' })
    plan!: Plan;

    @Column({
        name: 'max_video_quality',
        type: 'enum',
        enum: VideoQuality,
        default: VideoQuality.HD,
    })
    maxVideoQuality!: VideoQuality;

    @Column({
        name: 'audio_qualities',
        type: 'enum',
        enum: AudioQuality,
        array: true,
        default: [AudioQuality.STEREO],
    })
    audioQualities!: AudioQuality[];

    @Column({
        name: 'allowed_devices',
        type: 'enum',
        enum: DeviceType,
        array: true,
        default: [DeviceType.MOBILE, DeviceType.COMPUTER],
    })
    allowedDevices!: DeviceType[];

    @Column({ name: 'max_concurrent_streams', type: 'smallint', default: 1 })
    maxConcurrentStreams!: number;

    @Column({ name: 'max_concurrent_downloads', type: 'smallint', default: 1 })
    maxConcurrentDownloads!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}