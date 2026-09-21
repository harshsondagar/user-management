import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { PlanEntitlement } from './plan-entitlement-entity';
import { PlanStreamingPolicy } from './plan-streaming-policy-entity';

export enum PlanScope {
    INDIVIDUAL = 'individual',
    ORGANIZATION = 'organization',
}

@Entity('plans')
export class Plan {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    code!: string; // e.g. 'free', 'pro', 'enterprise'

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    stripePriceId?: string | null; // null for the free plan — no real Stripe Price object

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @OneToMany(() => PlanEntitlement, (entitlement) => entitlement.plan)
    entitlements!: PlanEntitlement[];

    @OneToOne(() => PlanStreamingPolicy, (policy) => policy.plan)
    streamingPolicy?: PlanStreamingPolicy

    @Column({ type: 'int', default: 0 })
    rank!: number;

    @Column({ type: 'int' })
    amount!: number;

    @Column({ type: 'varchar', length: 3, default: 'inr' })
    currency!: string;

    @Column({ type: 'int', default: 0 })
    gracePeriodDays!: number;

    @Column({ type: 'enum', enum: PlanScope, default: PlanScope.INDIVIDUAL })
    scope!: PlanScope;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}