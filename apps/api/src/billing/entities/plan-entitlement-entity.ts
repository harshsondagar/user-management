import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Plan } from './plan-entity';
import { Feature } from './feature-entity';

export enum EntitlementPeriod {
    DAILY = 'daily',
    MONTHLY = 'monthly',
    LIFETIME = 'lifetime',
}

@Entity('plan_entitlements')
export class PlanEntitlement {
    @PrimaryColumn('uuid')
    planId!: string;

    @PrimaryColumn('uuid')
    featureId!: string;

    @ManyToOne(() => Plan, (plan) => plan.entitlements, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'planId' })
    plan!: Plan;

    @ManyToOne(() => Feature, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'featureId' })
    feature!: Feature;

    @Column({ type: 'int' })
    valueLimit!: number;

    @Column({ type: 'enum', enum: EntitlementPeriod })
    period!: EntitlementPeriod;
}