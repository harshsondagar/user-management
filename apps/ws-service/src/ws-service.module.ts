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

@Module({
  imports: [],
  controllers: [WsServiceController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
    { provide: APP_FILTER, useClass: WsExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ActivityTrackerInterceptor },
    RateLimitInterceptor,
    WsServiceService,
    WsGateway,
    RoomsService,
    ChatHandler,
    JwtService,
  ],
})
export class WsServiceModule { }
