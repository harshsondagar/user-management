import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user-entity';
import { SuperAdminSeed } from '../seed/super-admin-seed';
import { System } from './system-entity';
import { SystemService } from './system.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, System]),],
  providers: [UserService, SuperAdminSeed, SystemService],
  controllers: [UserController],
  exports: [UserService, SystemService]
})

export class UserModule { }
