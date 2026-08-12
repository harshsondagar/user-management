import "dotenv/config"
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TaskModule } from './task/task.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { maintenanceGuard } from './common/gaurds/maintainence-gaurd';
import { JwtGuard } from './auth/gurads/jwt.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { HealthModule } from './common/health/health.module';
import { CustomThrottlerGuard } from './throttler/custom-throttler.guard';
import { AppThrottleModule } from './throttler/throttler.module';
import { MailModule } from './mail/mail.module';
import { OtpModule } from './common/otp/otp.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncModule } from './sync/sync.module';
import { RolesGuard } from "./common/gaurds/roles.guard";
import { ScrapModuleModule } from './scrap-module/scrap-module.module';
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs"
import { ExpressAdapter } from "@bull-board/express";
import { ReportModule } from "./report/report.module";
import configuration from "./config/configuration";
import { DlqModule } from "./dlq/dlq.module";
import { AttachUserContextInterceptor, RequestContextMiddleware } from "@app/shared";
import { LogCleanupService } from "@app/shared";


@Module({
  imports: [ScheduleModule.forRoot(),
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: 'apps/api/.env',
    load: [configuration]
  }),
  BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      connection: {
        host: config.getOrThrow<string>('redis.host'),
        port: config.getOrThrow<number>('redis.port'),
      },
    }),
  }),
  BullBoardModule.forRoot({
    route: '/admin/queues',
    adapter: ExpressAdapter,
  }),
<<<<<<< Updated upstream
    AppThrottleModule, HealthModule, RedisCacheModule,
  TypeOrmModule.forRootAsync({
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
      entities: ['src/**/*.entity.ts'],
      synchronize: false,
      retryAttempts: 10,
      retryDelay: 3000
    }),
  }), UserModule, AuthModule,
=======
    AppThrottleModule, HealthModule, RedisCacheModule, MongooseModule.forRoot(process.env.MONGO_URI!), TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: 6432,
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        entities: ['src/**/*.entity.ts'],
        migrations: [__dirname, '../migration/*{.ts,.js}'],
        synchronize: false
      }),
    }), UserModule, AuthModule,
>>>>>>> Stashed changes
    TaskModule, MailModule,
    OtpModule, ReportModule,
    // DatagovModule,
    SyncModule,
    ScrapModuleModule,
    DlqModule
  ],
  controllers: [],
  providers: [AppService, {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter
  }, {
      provide: APP_GUARD, useClass: CustomThrottlerGuard
    }, {
      provide: APP_GUARD, useClass: maintenanceGuard
    }, {
      provide: APP_GUARD, useClass: JwtGuard
    }, {
      provide: APP_GUARD, useClass: RolesGuard
    },
    { provide: APP_INTERCEPTOR, useClass: AttachUserContextInterceptor },
    { provide: LogCleanupService, useFactory: () => new LogCleanupService("api") }
  ]
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*')
  }
}
