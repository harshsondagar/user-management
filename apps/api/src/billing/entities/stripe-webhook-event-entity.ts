import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('stripe_webhook_events')
export class StripeWebhookEvent {
    @PrimaryColumn({ type: 'varchar' })
    stripeEventId!: string;

    @Column({ type: 'varchar' })
    type!: string;

    @Column({ type: 'timestamptz', nullable: true })
    processedAt!: Date | null;

    @Column({ type: 'jsonb' })
    payload!: Record<string, any>;
}