// apps/api/src/billing/webhook/webhook.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { WebhookProducer } from './webhook.producer';
import { StripeEventProcessor } from './stripe-event.processor';
import { StripeWebhookEvent } from '../billing/entities/stripe-webhook-event-entity';
import { UserSubscription } from '../billing/entities/user-subscription-entity';
import { Plan } from '../billing/entities/plan-entity';
import { Payment } from '../billing/entities/payment-entity';
import { StripeWebhookRepository } from '../billing/repositorys/stripe-webhook.repository';
import { UserSubscriptionRepository } from '../billing/repositorys/user-subscription.repository';
import { PlanRepository } from '../billing/repositorys/plan.repository';
import { PaymentRepository } from '../billing/repositorys/payment.repository';

@Module({
    imports: [
        BullModule.registerQueue({ name: 'stripe-events' }),
        TypeOrmModule.forFeature([StripeWebhookEvent, UserSubscription, Plan, Payment]),
    ],
    controllers: [StripeWebhookController],
    providers: [StripeWebhookService, WebhookProducer, StripeEventProcessor, StripeWebhookRepository, UserSubscriptionRepository, PlanRepository, PaymentRepository],
})
export class WebhookModule { }