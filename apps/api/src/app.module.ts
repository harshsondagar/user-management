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
import { testEnv } from "@app/shared";
import { BillingModule } from "./billing/billing.module";
import { WebhookModule } from "./webhooks/stripe-webhook.module";
import { join } from "path";
import { ServeStaticModule } from "@nestjs/serve-static"
import { RoomModule } from './room/room.module';

const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
const tEnv = isTestEnv ? testEnv() : null;



@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, 'public') }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isTestEnv
        ? 'apps/api/test/.env.test'
        : 'apps/api/.env',
      load: [configuration]
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: tEnv?.redisHost ?? config.getOrThrow<string>('redis.host'),
          port: tEnv ? tEnv.redisPort : config.getOrThrow<number>('redis.port'),
          db: tEnv ? tEnv.redisDb : config.get<number>('redis.db', 0),
        },
      }),
    }),

    // BullModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     connection: {
    //       host: config.getOrThrow<string>('redis.host'),
    //       port: config.getOrThrow<number>('redis.port'),
    //     },
    //   }),
    // }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    AppThrottleModule, HealthModule, RedisCacheModule, WebhookModule,
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     type: 'postgres',
    //     host: config.get<string>('database.host'),
    //     port: config.get<number>('database.port'),
    //     username: config.get<string>('database.username'),
    //     password: config.get<string>('database.password'),
    //     database: config.get<string>('database.name'),
    //     autoLoadEntities: true,
    //     entities: ['src/**/*.entity.ts'],
    //     synchronize: false,
    //     retryAttempts: 10,
    //     retryDelay: 3000
    //   }),
    // }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: tEnv?.postgresHost ?? config.get<string>('database.host'),
        port: tEnv ? tEnv.postgresPort : config.get<number>('database.port'),
        username: tEnv?.postgresUser ?? config.get<string>('database.username'),
        password: tEnv?.postgresPassword ?? config.get<string>('database.password'),
        database: tEnv?.dbName ?? config.get<string>('database.name'),
        autoLoadEntities: true,
        entities: ['src/**/*.entity.ts'],
        synchronize: false,
        retryAttempts: 10,
        retryDelay: 3000
      }),
    }),
    UserModule, AuthModule,
    TaskModule, MailModule,
    OtpModule, ReportModule,
    BillingModule,
    SyncModule,
    ScrapModuleModule,
    DlqModule,
    RoomModule
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
