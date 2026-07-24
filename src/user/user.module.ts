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

@Module({
  imports: [forwardRef(() => AuthModule), TypeOrmModule.forFeature([User, System, Followers]),],
  providers: [UserService, SuperAdminSeed, SystemService],
  controllers: [UserController, SuperAdminController],
  exports: [UserService, SystemService]
})

export class UserModule { }
