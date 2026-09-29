import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum SettlementStatus {
    DRAFT = 'draft',
    CALCULATED = 'calculated',
    POSTED = 'posted',
    FAILED = 'failed',
}

const bigintTransformer = {
    to: (v?: number | null) => v,
    from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};


@Entity('settlement_runs')
export class SettlementRun {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'date', unique: true })
    periodStart!: string;

    @Column({ type: 'date' })
    periodEnd!: string;

    @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.DRAFT })
    status!: SettlementStatus;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    grossCollectedCents!: number;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    platformShareCents!: number;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    creatorPoolCents!: number;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    totalWatchSeconds!: number;

    @Column({ type: 'jsonb', nullable: true })
    ledgerTransferIds!: string[] | null;

    @Column({ type: 'timestamptz', nullable: true })
    postedAt?: Date | null;

    @Column({ type: 'varchar', nullable: true })
    error?: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
