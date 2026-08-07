import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailModule } from "./mail/mail.module";
import { SyncModule } from "./sync/sync.module";
import { DlqModule } from "./dlq/dlq.module";
import { DatagovModule } from "./data-gov/datagov.module";
import { MongooseModule } from "@nestjs/mongoose";
import configuration from "./config/configuration";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // makes ConfigService available everywhere without re-importing
            load: [configuration], // 👈 Loads your custom object
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: () => ({
                type: 'postgres',
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT) || 5432,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                autoLoadEntities: true, // Automatically loads shared & app entities
                synchronize: false,
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
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: Number(process.env.REDIS_PORT) || 6379,
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
    providers: [],
})
export class AppModule { }