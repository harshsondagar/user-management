import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Plan } from './plan-entity';
import { User } from '../../user/entity/user-entity';

export enum SubscriptionStatus {
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    INCOMPLETE = 'incomplete',
}

@Entity('user_subscriptions')
@Index('idx_user_subscriptions_created_at', ['createdAt'])
@Index('idx_user_subscriptions_user_id', ['userId'])
@Index(['userId'])
export class UserSubscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @Index('IDX_SUBSCRIPTION_USER')
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column('uuid')
    planId!: string;

    @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'planId' })
    plan!: Plan;

    @Column({ type: 'enum', enum: SubscriptionStatus })
    status!: SubscriptionStatus;

    @Column({ type: 'timestamptz', nullable: true })
    currentPeriodEnd?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    graceStartedAt?: Date | null;

    @Index('idx_subs_created_at')
    @Column({ type: 'timestamptz', nullable: true })
    canceledAt?: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}