import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Organization } from './organization-entity';
import { Plan } from '../../billing/entities/plan-entity';

export enum SubscriptionStatus {
    ACTIVE = 'active',
    CANCELED = 'canceled',
    PAST_DUE = 'past_due',
}

@Entity('organization_subscriptions')
export class OrganizationSubscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index('idx_org_subscriptions_organization_id')
    @Column('uuid', { name: 'organization_id' })
    organization_id!: string;

    @Column('uuid', { name: 'planId' })
    plan_id!: string;

    @Column({
        type: 'enum',
        enum: SubscriptionStatus,
        enumName: 'subscription_status_enum',
    })
    status!: SubscriptionStatus;

    @Column({ name: 'currentPeriodEnd', type: 'timestamptz', nullable: true })
    current_period_end?: Date | null;

    @Column({ name: 'graceStartedAt', type: 'timestamptz', nullable: true })
    grace_started_at?: Date | null;

    @Column({ name: 'canceledAt', type: 'timestamptz', nullable: true })
    canceled_at?: Date | null;

    @Index('idx_org_subscriptions_created_at')
    @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // Relationships
    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id', referencedColumnName: 'id' })
    organization!: Organization;

    @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'planId', referencedColumnName: 'id' })
    plan!: Plan;
}
