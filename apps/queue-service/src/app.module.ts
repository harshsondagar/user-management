import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";


@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.get('REDIS_HOST', 'localhost'),
                    port: config.get<number>('REDIS_PORT', 6379),
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue(
            { name: 'send-email' },
            { name: 'scrape-gov-data' },
        )],
    providers: []
})
export class AppModule { }