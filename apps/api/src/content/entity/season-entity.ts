import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    Index,
    Unique,
} from 'typeorm';
import { Content } from './conetnt-entity';
import { Episode } from './episode-entity';

@Entity('seasons')
@Unique('uq_seasons_series_id_season_number', ['seriesId', 'seasonNumber'])
export class Season {
    @PrimaryColumn('uuid')
    id!: string;

    @Index('idx_seasons_series_id')
    @Column({ name: 'series_id', type: 'uuid' })
    seriesId!: string;

    @ManyToOne(() => Content, (content) => content.seasons, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'series_id' })
    series!: Content;

    @Column({ name: 'season_number', type: 'smallint' })
    seasonNumber!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title?: string | null;

    @OneToMany(() => Episode, (episode) => episode.season)
    episodes!: Episode[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}