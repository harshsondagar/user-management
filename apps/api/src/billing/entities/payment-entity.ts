import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserSubscription } from './user-subscription-entity';

export enum PaymentStatus {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    PENDING = 'pending',
    REFUNDED = 'refunded',
}

@Entity('payments')
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

    @Column({ type: 'int' })
    amount!: number; // in smallest currency unit (cents), matching Stripe's convention

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ type: 'enum', enum: PaymentStatus })
    status!: PaymentStatus;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt?: Date | null;
}