import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('usage_counters')
export class UsageCounter {
    @PrimaryColumn('uuid')
    userId!: string;

    @PrimaryColumn('uuid')
    featureId!: string;

    @PrimaryColumn({ type: 'timestamptz' })
    periodStart!: Date;

    @Column({ type: 'timestamptz' })
    periodEnd!: Date;

    @Column({ type: 'int', default: 0 })
    count!: number;
}