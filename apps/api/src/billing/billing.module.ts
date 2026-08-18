import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan-entity';
import { Feature } from './entities/feature-entity';
import { PlanEntitlement } from './entities/plan-entitlement-entity';
import { UserSubscription } from './entities/user-subscription-entity';
import { BillingSeedService } from './seed/billing.seed';
import { PlanRepository } from './repositorys/plan.repository';
import { FeatureRepository } from './repositorys/feature.repository';
import { EntitlementRepository } from './repositorys/plan-entitlement.repository';
import { PaymentRepository } from './repositorys/payment.repository';
import { StripeWebhookEvent } from './entities/stripe-webhook-event-entity';
import { UsageCounter } from './entities/usage-counter-entity';
import { Payment } from './entities/payment-entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UserRepository } from '../user/user.repository';
import { User } from '../user/entity/user-entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Plan,
            Feature,
            PlanEntitlement,
            UserSubscription,
            StripeWebhookEvent,
            UsageCounter,
            Payment,
            User
        ]),
    ],

    providers: [
        {
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
        BillingSeedService,
        UserRepository,
        BillingService,
        PlanRepository,
        EntitlementRepository,
        FeatureRepository,
        PaymentRepository,
    ],
    controllers: [BillingController],
    exports: [TypeOrmModule, 'STRIPE_CLIENT'],
})
export class BillingModule { }
