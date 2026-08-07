import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { redisConnection } from "@app/shared"

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT!)
            }
        }),
        BullModule.registerQueue(
            { name: 'send-email' },
            { name: 'scrape-gov-data' },
        )],
    providers: []
})
export class AppModule { }