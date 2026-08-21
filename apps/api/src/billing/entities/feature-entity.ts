import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('features')
export class Feature {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    key!: string; // e.g. 'scrape_requests' — used in code, never displayed raw

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;
}