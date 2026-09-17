import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entity/conetnt-entity';
import { Season } from './entity/season-entity';
import { Episode } from './entity/episode-entity';
import { ContentRepository } from './repository/content-repository';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentAccessGuard } from './gaurd/content.access-gaurd';
import { ProfilesModule } from '../profile/profile.module';
import { EpisodeRepository } from './repository/episode.repository';
import { SubscriptionsService } from './service/subsciption.service';
import { UserSubscription } from '../billing/entities/user-subscription-entity';
import { UserSubscriptionRepository } from '../billing/repositorys/user-subscription.repository';
import { PlanRepository } from '../billing/repositorys/plan.repository';
import { Plan } from '../billing/entities/plan-entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Content, Season, Episode, UserSubscription, Plan]),
        ProfilesModule, // for ProfilesService.findOneForUser() ownership checks
        // Wherever SubscriptionsService actually lives - your existing
        // BillingModule, most likely. It needs to export SubscriptionsService
        // for ContentAccessGuard's constructor injection below to resolve.
        // BillingModule,
    ],
    controllers: [ContentController],
    providers: [ContentRepository, ContentService, ContentAccessGuard, EpisodeRepository, SubscriptionsService, UserSubscriptionRepository, PlanRepository],
    // ContentAccessGuard exported so WatchHistoryModule (and anywhere else
    // that gates actual playback) can reuse the same published-status +
    // premium-access check instead of duplicating it.
    exports: [ContentService, ContentAccessGuard],
})
export class ContentModule { }