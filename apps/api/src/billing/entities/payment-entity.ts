import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Check } from 'typeorm';
import { UserSubscription } from './user-subscription-entity';

export enum PaymentStatus {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    PENDING = 'pending',
    REFUNDED = 'refunded',
}

@Entity('payments')
@Entity('payments')
@Check(
    'chk_payments_exactly_one_subscription',
    '("userSubscriptionId" IS NOT NULL AND "organizationSubscriptionId" IS NULL) OR ' +
    '("userSubscriptionId" IS NULL AND "organizationSubscriptionId" IS NOT NULL)',
)
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userSubscriptionId!: string;

    @ManyToOne(() => UserSubscription, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userSubscriptionId' })
    userSubscription!: UserSubscription;

    @Column({ type: 'varchar' })
    stripeInvoiceId!: string;

    @Column('uuid', { nullable: true })
    organizationSubscriptionId?: string | null;

    @Column({ type: 'int' })
    amount!: number;

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ type: 'enum', enum: PaymentStatus })
    status!: PaymentStatus;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt?: Date | null;
}