import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Check } from 'typeorm';
import { UserSubscription } from './user-subscription-entity';
import { OrganizationSubscription } from '../../organization/entities/organization-subsciription-entity';

export enum PaymentStatus {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    PENDING = 'pending',
    REFUNDED = 'refunded',
}

@Entity('payments')
@Check(
    'chk_payments_exactly_one_subscription',
    '("userSubscriptionId" IS NOT NULL AND "organizationSubscriptionId" IS NULL) OR ' +
    '("userSubscriptionId" IS NULL AND "organizationSubscriptionId" IS NOT NULL)',
)
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid', { nullable: true })
    userSubscriptionId?: string | null;

    @ManyToOne(() => UserSubscription, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'userSubscriptionId' })
    userSubscription?: UserSubscription | null;

    @Column('uuid', { nullable: true })
    organizationSubscriptionId?: string | null;

    @ManyToOne(() => OrganizationSubscription, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'organizationSubscriptionId' })
    organizationSubscription?: OrganizationSubscription | null;

    @Column({ type: 'varchar' })
    stripeInvoiceId!: string;

    @Column({ type: 'int' })
    amount!: number; // in smallest currency unit (cents), matching Stripe's convention

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ type: 'enum', enum: PaymentStatus })
    status!: PaymentStatus;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt?: Date | null;
}