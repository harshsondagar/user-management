import { Module } from '@nestjs/common';
import { WsServiceController } from './ws-service.controller';
import { WsServiceService } from './ws-service.service';
import { WsGateway } from './components/ws/ws.gateway';
import { RoomsService } from './components/ws/service/room-service';
import { ChatHandler } from './components/ws/handle/chat.handler';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [WsServiceController],
  providers: [WsServiceService, WsGateway, RoomsService, ChatHandler, JwtService],
})
export class WsServiceModule { }
