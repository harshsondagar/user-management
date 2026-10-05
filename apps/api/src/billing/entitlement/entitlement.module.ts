// apps/api/src/billing/entitlement/entitlement.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscription } from '../entities/user-subscription-entity';
import { PlanEntitlement } from '../entities/plan-entitlement-entity';
import { Feature } from '../entities/feature-entity';
import { UsageCounter } from '../entities/usage-counter-entity';
import { EntitlementService } from './entitlement.service';
import { EntitlementGuard } from './entitlement.guard';
import { UserSubscriptionRepository } from '../repositorys/user-subscription.repository';
import { EntitlementRepository } from '../repositorys/plan-entitlement.repository';
import { FeatureRepository } from '../repositorys/feature.repository';
import { UsageRepository } from '../repositorys/usage.repository';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [TypeOrmModule.forFeature([UserSubscription, PlanEntitlement, Feature, UsageCounter]),
    RedisModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory(configService: ConfigService) {

            const host = configService.get<string>('redis.host', 'localhost');
            const port = configService.get<number>('redis.port', 6379);
            const db = configService.get<number>('redis.db', 0);

            const url = `redis://${host}:${port}/${db}`;

            return {
                type: 'single',
                url
            };
        },
    })
    ],
    providers: [EntitlementService, EntitlementGuard, UserSubscriptionRepository, EntitlementRepository, FeatureRepository, UsageRepository],
    exports: [EntitlementService, EntitlementGuard],
})
export class EntitlementModule { }