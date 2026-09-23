import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Plan } from '../../billing/entities/plan-entity';
import { Organization } from './organization-entity';
import { SubscriptionStatus } from '../../billing/entities/user-subscription-entity';  // reused - same lifecycle states apply to org subscriptions

@Entity('organization_subscriptions')
@Index('idx_org_subscriptions_organization_id', ['organizationId'])
@Index('idx_org_subscriptions_created_at', ['createdAt'])
export class OrganizationSubscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    organizationId!: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization!: Organization;

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

    @Column({ type: 'timestamptz', nullable: true })
    canceledAt?: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}