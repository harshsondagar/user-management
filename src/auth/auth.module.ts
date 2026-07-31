import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from "@nestjs/jwt"
import { LocalStrategy } from '../stretagey/localAuth-strtegey';
import { JwtRefreshStrategy } from '../stretagey/jwtRefresh.strategy';
import { JwtStrategy } from '../stretagey/jwt-stratagey';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './jwt-entity';
import { JwtGuard } from './gurads/jwt.guard';
import { PassportModule } from '@nestjs/passport';
import { OtpModule } from '../common/otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { RefreshTokenRepository } from './refreshTokenRepository';
import { UserRepository } from '../user/user.repository';

@Module({
  imports: [forwardRef(() => UserModule), PassportModule, MailModule, OtpModule, JwtModule.register({}), TypeOrmModule.forFeature([RefreshToken])],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy, RefreshTokenRepository, UserRepository,
    {
      provide: APP_GUARD, useClass: JwtGuard
    },
  ],
  controllers: [AuthController], exports: [AuthService],
})
export class AuthModule { }
