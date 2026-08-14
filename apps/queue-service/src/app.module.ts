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
import { AttachUserContextInterceptor, RequestContextMiddleware, testEnv } from "@app/shared";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LogCleanupService } from "@app/shared";

const workerId = process.env.JEST_WORKER_ID!

const isTestEnv = process.env.NODE_ENV === 'test' || workerId;
const tEnv = isTestEnv ? testEnv() : null;

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: isTestEnv
                ? 'apps/api/test/.env.test'
                : 'apps/queue-service/.env',
            load: [configuration]
        }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: tEnv?.postgresHost ?? config.get<string>('database.host'),
                port: tEnv?.postgresPort ?? config.get<number>('database.port'),
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
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: () => ({
                uri: tEnv
                    ? tEnv.mongoUri!
                    : process.env.MONGO_URI!,
            }),
        }),
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: tEnv?.redisHost ?? config.getOrThrow<string>('redis.host'),
                    port: tEnv?.redisPort ?? config.getOrThrow<number>('redis.port'),
                    db: tEnv?.redisDb ?? config.get<number>('redis.db', 0),
                },
            }),
        }),
        BullModule.registerQueue(
            { name: `scrape-gov-data` },
            { name: 'send-mail' },
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