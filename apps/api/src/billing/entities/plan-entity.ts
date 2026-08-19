import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PlanEntitlement } from './plan-entitlement-entity';

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

    @Column({ type: 'int', default: 0 })
    rank!: number;

    @Column({ type: 'int', default: 0 })
    gracePeriodDays!: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}