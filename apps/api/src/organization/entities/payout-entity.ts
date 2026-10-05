import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { bigintTransformer } from "../../billing/entities/payment-entity";


export enum PayoutStatus {
    REQUESTED = 'requested',
    APPROVED = 'approved',
    PAID = 'paid',
    REJECTED = 'rejected',
    FAILED = 'failed',
}

@Entity('payouts')
@Index(['organizationId', 'status'])
export class Payout {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    organizationId!: string;

    @Column({ type: 'uuid' })
    requestedByUserId!: string;

    @Column({ type: 'bigint', transformer: bigintTransformer })
    amountCents!: number;

    @Column({ type: 'char', length: 3, default: 'USD' })
    currency!: string;

    @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.REQUESTED })
    status!: PayoutStatus;

    @Column({ type: 'uuid', nullable: true })
    approvedByUserId?: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    approvedAt?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt?: Date | null;

    @Column({ type: 'varchar', nullable: true })
    rejectionReason?: string | null;

    @Column({ type: 'varchar', nullable: true })
    externalReference?: string | null;

    @Column({ type: 'jsonb', nullable: true })
    ledgerTransferIds?: string[] | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
