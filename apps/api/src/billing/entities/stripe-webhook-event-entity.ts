import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stripe_webhook_events')
export class StripeWebhookEvent {
    @PrimaryColumn({ type: 'varchar' })
    stripeEventId!: string;

    @Column({ type: 'varchar' })
    type!: string;

    @Column({ type: 'timestamptz', nullable: true })
    processedAt!: Date | null;

    @Column({ type: 'varchar', nullable: true }) error?: string | null;

    @Column({ type: 'jsonb' })
    payload!: Record<string, any>;

    @CreateDateColumn({ type: 'timestamptz' })
    receivedAt!: Date
}


