import * as dotenv from "dotenv"
import { join, resolve } from "path";
dotenv.config({ path: resolve(join(process.cwd(), "/apps/ws-service/.env")) })
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './service/room-service';
import { Logger, UseGuards, UseInterceptors, } from '@nestjs/common';
import { JoinRoomDto } from './dto/join-room.dto';
import { MoveDto } from './dto/move-dto';
import { ChatDto } from './dto/chat-dto';
import { ChatHandler } from './handle/chat.handler';
import { JwtService } from '@nestjs/jwt';
import { WsAuthGuard } from './guard/ws-auth.guard';
import { RateLimitInterceptor } from "./interceptors/rate-limit.interceptor";
import { ActivityTrackerInterceptor } from "./interceptors/activity-tracker.interceptor";


@UseInterceptors(RateLimitInterceptor, ActivityTrackerInterceptor)
@WebSocketGateway(8080, {
  cors: { origin: '*' },
  pingInterval: 10000,  // server pings every 10s
  pingTimeout: 5000,
})


export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name)
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rooms: RoomsService,
    private readonly chatHandler: ChatHandler,
    private readonly jwt: JwtService,
    private readonly rateLimiter: RateLimitInterceptor
  ) {
    this.rooms.on('user-timed-out', ({ roomId, userId }) => {
      this.server.to(roomId).emit('user_left', { userId });
    });
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) throw new Error('No token provided');

      const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      client.data.userId = payload.sub;
      client.data.username = payload.username;
    } catch (err) {
      client.emit('auth_error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: string): string {
    return 'pong';
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('join_room')
  handleJoin(@MessageBody() dto: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const { user, reconnected } = this.rooms.join(
      dto.roomId,
      client.data.username,
      client.data.userId,
      client.id
    )

    client.join(dto.roomId);

    client.emit('room_state', { users: this.rooms.getRoomUsers(dto.roomId) });

    if (reconnected) {
      client.to(dto.roomId).emit('user_reconnected', user);
    } else {
      client.to(dto.roomId).emit('user_joined', user);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('move')
  handleMove(@MessageBody() dto: MoveDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const result = this.rooms.move(client.id, dto.direction);
    if (!result) return;

    this.server.to(result.roomId).emit('user_moved', {
      userId,
      x: result.x,
      y: result.y,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat')
  onChat(@MessageBody() dto: ChatDto, @ConnectedSocket() client: Socket) {
    this.chatHandler.handle(dto, client, this.server);
  }

  handleDisconnect(client: Socket) {
    const info = this.rooms.leave(client.id);
    this.rateLimiter.clearClient(client.id);
    if (!info) return;

    this.server.to(info.roomId).emit('user_disconnected', { userId: info.userId });
  }
}


