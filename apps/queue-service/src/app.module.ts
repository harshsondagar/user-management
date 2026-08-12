import "dotenv/config"
import { BullModule } from "@nestjs/bullmq";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailModule } from "./mail/mail.module";
import { SyncModule } from "./sync/sync.module";
import { DlqModule } from "./dlq/dlq.module";
import { DatagovModule } from "./data-gov/datagov.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import configuration from "./config/configuration";
import { AppController } from "../app.controller";
import { DatagovDebugController } from "./data-gov/datagov.controller";
import { InternalDlqController } from "./dlq/internal-dlq.controller";
import { AttachUserContextInterceptor, RequestContextMiddleware } from "@app/shared";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LogCleanupService } from "@app/shared";


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: 'apps/queue-service/.env',
            load: [configuration]
        }),
        ScheduleModule.forRoot(),
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
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: () => ({
                uri: process.env.MONGO_URI,
            }),
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
        BullModule.registerQueue(
            { name: 'send-email' },
            { name: 'scrape-gov-data' },
        ),
        MailModule,
        SyncModule,
        DlqModule,
        DatagovModule
    ],
    controllers: [AppController, DatagovDebugController, InternalDlqController],
    providers: [
        { provide: APP_INTERCEPTOR, useClass: AttachUserContextInterceptor },
        { provide: LogCleanupService, useFactory: () => new LogCleanupService("queue-service") }
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestContextMiddleware).forRoutes('*')
    }
}

