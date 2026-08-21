import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('renewal_tokens')
export class RenewalToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @Column({ type: 'uuid' })
    userSubscriptionId!: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 64 })
    token!: string;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    usedAt?: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}