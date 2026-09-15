import { Module, ValidationPipe } from '@nestjs/common';
import { WsServiceController } from './ws-service.controller';
import { WsServiceService } from './ws-service.service';
import { WsGateway } from './components/ws/ws.gateway';
import { RoomsService } from './components/ws/service/room-service';
import { ChatHandler } from './components/ws/handle/chat.handler';
import { JwtService } from '@nestjs/jwt';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { WsExceptionFilter } from './components/ws/fillters/ws-exception.filter';
import { ActivityTrackerInterceptor } from './components/ws/interceptors/activity-tracker.interceptor';
import { RateLimitInterceptor } from './components/ws/interceptors/rate-limit.interceptor';
import { IpConnectionLimiter } from './components/ws/rate-limit/ip-connection-limiter.service';
import { redisProvider } from './redis/redis.provider';
import { ChatPersistenceQueue } from './components/ws/chats/chat-persistence-queue';
import { ChatImageReadySubscriber } from './chat-image-ready.subscriber';
import { MinioService } from '@app/shared';
import { ConfigModule } from '@nestjs/config';
import configuration from './components/ws/config/configuration';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ".env",
    load: [configuration]
  }),],
  controllers: [WsServiceController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
    { provide: APP_FILTER, useClass: WsExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ActivityTrackerInterceptor },
    ChatPersistenceQueue,
    redisProvider,
    RateLimitInterceptor,
    WsServiceService,
    WsGateway,
    RoomsService,
    ChatHandler,
    JwtService,
    IpConnectionLimiter,
    ChatImageReadySubscriber,
    MinioService
  ],
})
export class WsServiceModule { }
