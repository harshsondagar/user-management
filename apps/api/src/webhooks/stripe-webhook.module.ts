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
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { WebhookReconciliationJob } from './stripe-Webhook-ReconciliationJob.processor';
import { UserRepository } from '../user/user.repository';
import { MailProducer } from '../mail/mail-producer';


@Module({
    imports: [
        BullModule.registerQueue({ name: 'stripe-events' }, { name: 'send-mail' }),
        TypeOrmModule.forFeature([StripeWebhookEvent, UserSubscription, Plan, Payment]),
    ],
    controllers: [StripeWebhookController],
    providers: [{
        provide: 'STRIPE_CLIENT', useFactory(configService: ConfigService) {

            const secretKey = configService.get<string>('stripe.key');
            if (!secretKey) {
                console.log(secretKey);

                throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
            }
            return new Stripe(secretKey);
        },
        inject: [ConfigService],
    },
        StripeWebhookService,
        WebhookProducer,
        StripeEventProcessor,
        WebhookReconciliationJob,
        StripeWebhookRepository,
        UserSubscriptionRepository,
        PlanRepository,
        PaymentRepository,
        UserRepository,
        MailProducer
    ],
    exports: ['STRIPE_CLIENT']
})
export class WebhookModule { }