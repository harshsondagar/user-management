import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { SettlementRun } from "./settlemennt.run-entity";
import { bigintTransformer } from "../../billing/entities/payment-entity";



@Entity('settlement_lines')
@Unique(['settlementRunId', 'organizationId'])
export class SettlementLine {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    settlementRunId!: string;

    @ManyToOne(() => SettlementRun, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'settlementRunId' })
    settlementRun!: SettlementRun;

    @Column({ type: 'uuid' })
    organizationId!: string;

    @Column({ type: 'bigint', transformer: bigintTransformer })
    watchSeconds!: number;

    @Column({ type: 'numeric', precision: 12, scale: 10 })
    shareRatio!: string;

    @Column({ type: 'bigint', transformer: bigintTransformer })
    amountCents!: number;

    @Column({ type: 'varchar', nullable: true })
    ledgerTransferId?: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
