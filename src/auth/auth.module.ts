import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from "@nestjs/jwt"
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [UserModule, JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      secret: config.get<string>('jwt.accessSecret'),
      signOptions: {
        expiresIn: config.get<number>('jwt.accessExpiresIn'),
      },
    })
  })],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule { }
