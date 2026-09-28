import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entity/conetnt-entity';
import { Season } from './entity/season-entity';
import { Episode } from './entity/episode-entity';
import { ContentRepository } from './repository/content-repository';
import { ContentService } from './service/content.service';
import { ContentController } from './controller/content.controller';
import { ContentAccessGuard } from './gaurd/content.access-gaurd';
import { ProfilesModule } from '../profile/profile.module';
import { EpisodeRepository } from './repository/episode.repository';
import { SubscriptionsService } from './service/subsciption.service';
import { UserSubscription } from '../billing/entities/user-subscription-entity';
import { UserSubscriptionRepository } from '../billing/repositorys/user-subscription.repository';
import { PlanRepository } from '../billing/repositorys/plan.repository';
import { Plan } from '../billing/entities/plan-entity';
import { ContentAdminController } from './controller/content-admin.controller';
import { ContentAdminService } from './service/content-admin.service';
import { OrganizationAccessService } from '../organization/service/organization-access.service';
import { Organization } from '../organization/entities/organization-entity';
import { OrganizationRepository } from '../organization/repositories/organization.repository';
import { MemberRepository } from '../organization/repositories/member.repository';
import { Member } from '../organization/entities/members-entity';
import { OrganizationSubscriptionRepository } from '../organization/repositories/organization.org-entitlement.repository';
import { OrganizationSubscription } from '../organization/entities/organization-subsciription-entity';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Content,
            Season,
            Episode,
            UserSubscription,
            Plan,
            Organization,
            Member,
            OrganizationSubscription
        ]),
        ProfilesModule,
        OrganizationModule
    ],
    controllers: [ContentController, ContentAdminController],
    providers: [
        ContentRepository,
        OrganizationRepository,
        MemberRepository,
        ContentService,
        ContentAdminService,
        OrganizationAccessService,
        ContentAccessGuard,
        EpisodeRepository,
        SubscriptionsService,
        UserSubscriptionRepository,
        PlanRepository,
        OrganizationSubscriptionRepository
    ],
    exports: [ContentService, ContentAccessGuard],
})
export class ContentModule { }
