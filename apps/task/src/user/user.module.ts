import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user-entity';
import { SuperAdminSeed } from '../seed/super-admin-seed';
import { System } from './system-entity';
import { SystemService } from './system.service';
import { SuperAdminController } from './super-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { Followers } from './userfollowers-entity';
import { RedisCacheModule } from '../common/cache/redis-cache.module';
import { OtpModule } from '../common/otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { UserRepository } from './user.repository';
import { FollowerRepository } from './follower.repository';
import { BullModule } from '@nestjs/bullmq';
import { MailProducer } from '../mail/mail-producer';

@Module({
  imports: [forwardRef(() => AuthModule), MailModule, OtpModule, RedisCacheModule, TypeOrmModule.forFeature([User, System, Followers])
    , BullModule.registerQueue({
      name: "send-mail"
    })],
  providers: [UserService, SuperAdminSeed, SystemService, UserRepository, FollowerRepository, MailProducer],
  controllers: [UserController, SuperAdminController],
  exports: [UserService, SystemService, TypeOrmModule]
})

export class UserModule { }
