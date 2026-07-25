
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TaskModule } from './task/task.module';
import path from 'path';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { maintenanceGuard } from './common/gaurds/maintainence-gaurd';
import { JwtGuard } from './auth/gurads/jwt.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { HealthModule } from './common/health/health.module';
import { CustomThrottlerGuard } from './throttler/custom-throttler.guard';
import { AppThrottleModule } from './throttler/throttler.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
    load: [configuration]
  }), AppThrottleModule, HealthModule, RedisCacheModule, TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      type: 'postgres',
      host: config.get<string>('database.host'),
      port: config.get<number>('database.port'),
      username: config.get<string>('database.username'),
      password: config.get<string>('database.password'),
      database: config.get<string>('database.name'),
      autoLoadEntities: true,
      entities: [path.join(__dirname, "../**/*-entity.js")],
      migrations: [__dirname, '../migration/*{.ts,.js}'],
      synchronize: true
    }),
  })
    , UserModule, AuthModule, TaskModule],
  controllers: [],
  providers: [AppService, {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter
  }, {
      provide: APP_GUARD, useClass: JwtGuard
    }, {
      provide: APP_GUARD, useClass: maintenanceGuard
    }, {
      provide: APP_GUARD, useClass: CustomThrottlerGuard
    },],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
