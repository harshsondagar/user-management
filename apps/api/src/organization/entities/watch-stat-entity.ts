import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

@Entity('watch_stats')
@Unique(['userId', 'contentId', 'day'])
@Index(['day', 'organizationId'])
export class WatchStat {
    @PrimaryGeneratedColumn('uuid') id!: string;

    @Column({ type: 'uuid' })
    userId!: string;
    @Column({ type: 'uuid' })
    contentId!: string;

    @Column({ type: 'uuid' })
    organizationId!: string;

    @Column({ type: 'date' })
    day!: string;

    @Column({ type: 'int', default: 0 })
    seconds!: number;

    @Column({ type: 'boolean', default: false })
    countsForEarnings!: boolean;

    @CreateDateColumn({ type: 'timestamptz' })

    createdAt!: Date;
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
