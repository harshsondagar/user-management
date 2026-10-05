import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Check, Index } from 'typeorm';
import { UserSubscription } from './user-subscription-entity';
import { OrganizationSubscription } from '../../organization/entities/organization-subsciription-entity';

export enum PaymentStatus {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    PENDING = 'pending',
    PARTIALLY_REFUNDED = 'partially_refunded', // added: refundedCents already existed but had no matching status
    REFUNDED = 'refunded',
}

export enum PaymentKind {
    USER_SUBSCRIPTION = 'user_subscription',
    ORG_SUBSCRIPTION = 'org_subscription',
}

export const bigintTransformer = {
    to: (v?: number | null) => v,
    from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};

@Entity('payments')
@Check(
    'chk_payments_exactly_one_subscription',
    '("userSubscriptionId" IS NOT NULL AND "organizationSubscriptionId" IS NULL) OR ' +
    '("userSubscriptionId" IS NULL AND "organizationSubscriptionId" IS NOT NULL)',
)
@Index(['settlementRunId'])
@Index(['status', 'paidAt'])
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'enum', enum: PaymentKind })
    kind!: PaymentKind;

    @Column({ type: 'uuid', nullable: true })
    userId!: string | null;

    @Column({ type: 'uuid', nullable: true })
    organizationId!: string | null;

    @Column('uuid', { nullable: true })
    subscriptionId?: string | null;

    @Column({ type: 'varchar', unique: true })
    stripePaymentIntentId!: string;

    @Column({ type: 'char', length: 3, default: 'USD' })
    currency!: string;

    // removed: `amount: number` (int) — duplicated amountCents and risked drifting out of sync.
    @Column({ type: 'bigint', transformer: bigintTransformer })
    amountCents!: number;

    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
    status!: PaymentStatus;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    platformShareCents!: number;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    creatorPoolShareCents!: number;

    @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
    refundedCents!: number;

    // changed: CASCADE -> RESTRICT. Deleting a subscription must NEVER delete payment history.
    // In practice you should never hard-delete a subscription row anyway, only change its status.
    @Column('uuid', { nullable: true })
    userSubscriptionId?: string | null;

    @ManyToOne(() => UserSubscription, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'userSubscriptionId' })
    userSubscription?: UserSubscription | null;

    @Column('uuid', { nullable: true })
    organizationSubscriptionId?: string | null;

    @ManyToOne(() => OrganizationSubscription, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'organizationSubscriptionId' })
    organizationSubscription?: OrganizationSubscription | null;

    // changed: nullable. You're PaymentIntent-only right now, so there is no Stripe Invoice object.
    // Keep the column for later if you ever move to Stripe Billing/Invoicing.
    @Column({ type: 'varchar', nullable: true })
    stripeInvoiceId?: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt?: Date | null;

    // --- new fields needed for settlement + ledger (Step 2/3) ---

    /** Billing period this payment covers. Lets settlement query payments with no joins. */
    @Column({ type: 'timestamptz', nullable: true })
    periodStart?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    periodEnd?: Date | null;

    /** Set once this payment's creator-pool share has been swept into a SettlementRun. Null = not yet settled. */
    @Column({ type: 'uuid', nullable: true })
    settlementRunId?: string | null;

    /** pgledger transfer ids written for this payment's split (and later, refund reversal). */
    @Column({ type: 'jsonb', nullable: true })
    ledgerTransferIds?: string[] | null;

    @Column({ type: 'timestamptz', nullable: true })
    ledgerRecordedAt?: Date | null;

    @Column({ type: 'varchar', nullable: true })
    failureReason?: string | null;
}