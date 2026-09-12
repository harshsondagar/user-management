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
import { AttachUserContextInterceptor, ChatMessage, RequestContextMiddleware, testEnv } from "@app/shared";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LogCleanupService } from "@app/shared";
import { ChatFlushService } from "./chats/chat-flush.service";
import roomdbConfig from "./config/roomdb.config";
const workerId = process.env.JEST_WORKER_ID!

const isTestEnv = process.env.NODE_ENV === 'test' || workerId;
const tEnv = isTestEnv ? testEnv() : null;




@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: isTestEnv
                ? 'apps/api/test/.env.test'
                : ['apps/queue-service/.env', 'apps/queue-service/.env.cp.api'],
            load: [configuration, roomdbConfig]
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
        TypeOrmModule.forRootAsync({
            name: 'roomsDb',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configPort = config.get<string | number>('roomdb.port');
                const parsedPort = typeof configPort === 'string' ? parseInt(configPort, 10) : configPort;
                console.log(config.get<string>('roomdb.database'));

                return {
                    type: 'postgres',
                    // FIXED: Changed 'roomsDatabase' lookup to match the 'roomdb' namespace exported in roomdb.config
                    host: tEnv?.postgresHost ?? config.get<string>('roomdb.host'),
                    port: tEnv?.postgresPort ?? parsedPort,
                    username: tEnv?.postgresUser ?? config.get<string>('roomdb.username'),
                    password: tEnv?.postgresPassword ?? config.get<string>('roomdb.password'),
                    database: tEnv?.dbName ?? config.get<string>('roomdb.database'),

                    // FIXED CRITICAL CRASH: Changed to true so background worker layers find entity definitions instantly
                    autoLoadEntities: true,
                    entities: [ChatMessage],
                    synchronize: false,
                };
            },
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
        ChatFlushService,
        { provide: APP_INTERCEPTOR, useClass: AttachUserContextInterceptor },
        { provide: LogCleanupService, useFactory: () => new LogCleanupService("queue-service") }
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestContextMiddleware).forRoutes('*')
    }
}