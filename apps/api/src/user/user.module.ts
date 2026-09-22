import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user-entity';
import { SuperAdminSeed } from '../seed/super-admin-seed';
import { System } from './entity/system-entity';
import { SystemService } from './system.service';
import { SuperAdminController } from './super-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { Followers } from './entity/userfollowers-entity';
import { RedisCacheModule } from '../common/cache/redis-cache.module';
import { OtpModule } from '../common/otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { UserRepository } from './user.repository';
import { FollowerRepository } from './follower.repository';
import { BullModule } from '@nestjs/bullmq';
import { MailProducer } from '../mail/mail-producer';
import { Plan } from '../billing/entities/plan-entity';
import { UserSubscription } from '../billing/entities/user-subscription-entity';
import { UserSubscriptionRepository } from '../billing/repositorys/user-subscription.repository';
import { ProfilesService } from '../profile/profile.service';
import { ProfileRepository } from '../profile/reposetory/profile.repo';
import { Profile } from '../profile/entity/profile-entity';
import { OrganizationsService } from '../organization/service/organization.service';
import { Member } from '../organization/entities/members-entity';
import { Organization } from '../organization/entities/organization-entity';
import { Permission } from '../organization/entities/permission-entity';
import { Role } from '../organization/entities/role-entity';
import { RolePermission } from '../organization/entities/role.permission-entity';
import { OrganizationRepository } from '../organization/repositories/organization.repository';
import { MemberRepository } from '../organization/repositories/member.repository';

@Module({
  imports: [forwardRef(() => AuthModule), MailModule, OtpModule, RedisCacheModule, TypeOrmModule.forFeature([User, System, Followers, Plan, UserSubscription, Profile, Member, Organization, Permission, Role, RolePermission])
    , BullModule.registerQueue({
      name: "send-mail"
    })],
  providers: [UserService, ProfilesService, ProfileRepository, SuperAdminSeed, SystemService, UserRepository, UserSubscriptionRepository, FollowerRepository, MailProducer, OrganizationsService, OrganizationRepository, MemberRepository],
  controllers: [UserController, SuperAdminController],
  exports: [UserService, SystemService, TypeOrmModule]
})

export class UserModule { }
