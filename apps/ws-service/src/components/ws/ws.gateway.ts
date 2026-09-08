import * as dotenv from "dotenv"
import { join, resolve } from "path";
dotenv.config({ path: resolve(join(process.cwd(), "/apps/ws-service/.env")) })
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './service/room-service';
import { BeforeApplicationShutdown, Logger, UseGuards, UseInterceptors, } from '@nestjs/common';
import { JoinRoomDto } from './dto/join-room.dto';
import { MoveDto } from './dto/move-dto';
import { ChatDto } from './dto/chat-dto';
import { ChatHandler } from './handle/chat.handler';
import { JwtService } from '@nestjs/jwt';
import { WsAuthGuard } from './guard/ws-auth.guard';
import { RateLimitInterceptor } from "./interceptors/rate-limit.interceptor";
import { ActivityTrackerInterceptor } from "./interceptors/activity-tracker.interceptor";
import { IpConnectionLimiter } from "./rate-limit/ip-connection-limiter.service";
import { LeaveRoomDto } from "./dto/leave-room.dto";
import { ReauthDto } from "./dto/reauth.dto";
import { LogContextInterceptor } from "./interceptors/log-context.interceptor";


const allowedOrigins = process.env.WS_ALLOWED_ORIGINS?.split(',') ?? [
  'http://localhost:3000',
  'http://localhost:5173',
];

@UseInterceptors(LogContextInterceptor, RateLimitInterceptor, ActivityTrackerInterceptor)
@WebSocketGateway(8080, {
  cors: { origin: allowedOrigins, credentials: true },
  pingInterval: 10000,  // server pings every 10s
  pingTimeout: 5000,
  maxHttpBufferSize: 1e4,
})


export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect, BeforeApplicationShutdown {
  private readonly logger = new Logger(WsGateway.name)

  private tokenTimers = new Map<string, { warning: NodeJS.Timeout; expiry: NodeJS.Timeout }>();
  private readonly WARNING_BEFORE_EXPIRY_MS = 30_000;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rooms: RoomsService,
    private readonly chatHandler: ChatHandler,
    private readonly jwt: JwtService,
    private readonly rateLimiter: RateLimitInterceptor,
    private readonly ipLimiter: IpConnectionLimiter
  ) {
    this.rooms.on('user-timed-out', ({ roomId, userId }) => {
      this.server.to(roomId).emit('user_left', { userId });
    });

    this.rooms.on('user-idle-changed', ({ roomId, userId, isIdle }) => {
      this.server.to(roomId).emit('user_idle_changed', { userId, isIdle });
    });

    this.rooms.on('user-idle-kicked', ({ roomId, userId, socketId }) => {
      this.rooms.leaveRoom(userId, roomId);
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('idle_kicked', { message: 'Disconnected due to inactivity' });
        socket.disconnect(true);
      }
    });

  }

  async beforeApplicationShutdown(signal?: string) {

    const count = this.server.sockets.sockets.size;
    this.logger.warn(`Shutting down (${signal}) — notifying ${count} connected clients`);

    this.server.emit('server_shutdown', { message: 'Server restarting, please reconnect shortly' });

    this.server.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (const socket of this.server.sockets.sockets.values()) {
      socket.disconnect(true);
    }

  }


  handleConnection(client: Socket) {

    const origin = client.handshake.headers.origin;
    const allowedOrigins = process.env.WS_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? [];

    // if (!origin || !allowedOrigins.includes(origin)) {
    //   this.logger.warn(`Rejected connection from disallowed origin: ${origin}`);
    //   client.disconnect(true);
    //   return;
    // }

    const ip = this.getClientIp(client);

    if (!this.ipLimiter.allow(ip)) {
      this.logger.warn(`Connection rate limit exceeded for IP: ${ip}`);
      client.emit('rate_limit_error', { message: 'Too many connection attempts, try again shortly' });
      client.disconnect(true);
      return;
    }

    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) throw new Error('No token provided');

      const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      client.data.userId = payload.sub;
      client.data.username = payload.username;

      if (typeof payload.exp !== 'number') {
        client.disconnect(true);
        return;
      }

      this.scheduleTokenExpiry(client, payload.exp);

    } catch (err) {
      client.emit('auth_error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private scheduleTokenExpiry(client: Socket, expSeconds: number) {
    const msUntilExpiry = expSeconds * 1000 - Date.now();

    if (msUntilExpiry <= 0) {
      client.disconnect(true);
      return;
    }

    const warningDelay = Math.max(0, msUntilExpiry - this.WARNING_BEFORE_EXPIRY_MS);

    const warning = setTimeout(() => {
      client.emit('token_expiring', { expiresInMs: this.WARNING_BEFORE_EXPIRY_MS });
    }, warningDelay);

    const expiry = setTimeout(() => {
      client.emit('token_expired', { message: 'Session expired, please reconnect' });
      client.disconnect(true);
    }, msUntilExpiry);

    this.tokenTimers.set(client.id, { warning, expiry });
  }

  private clearTokenTimers(socketId: string) {
    const timers = this.tokenTimers.get(socketId);
    if (timers) {
      clearTimeout(timers.warning);
      clearTimeout(timers.expiry);
      this.tokenTimers.delete(socketId);
    }
  }

  private getClientIp(client: Socket): string {
    const realIp = client.handshake.headers['x-real-ip'];
    if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;
    return client.handshake.address;
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

  @SubscribeMessage('reauth')
  handleReauth(@MessageBody() dto: ReauthDto, @ConnectedSocket() client: Socket) {
    try {
      const payload = this.jwt.verify(dto.token, { secret: process.env.JWT_ACCESS_SECRET });

      // sanity check — a reauth shouldn't be allowed to swap identity mid-session
      if (payload.sub !== client.data.userId) {
        throw new Error('Token does not match current session identity');
      }

      this.clearTokenTimers(client.id);
      this.scheduleTokenExpiry(client, payload.exp);
      client.emit('reauth_success', {});
    } catch (err) {
      client.emit('reauth_error', { message: (err as Error).message });
    }
  }


  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leave_room')
  handleLeaveRoom(@MessageBody() dto: LeaveRoomDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const removed = this.rooms.leaveRoom(userId, dto.roomId);

    if (removed) {
      client.leave(dto.roomId); // stop receiving this room's broadcasts
      client.emit('left_room', { roomId: dto.roomId });
    }
  }

  handleDisconnect(client: Socket) {
    this.clearTokenTimers(client.id);
    const info = this.rooms.leave(client.id);
    this.rateLimiter.clearClient(client.id);
    if (!info) return;

    this.server.to(info.roomId).emit('user_disconnected', { userId: info.userId });
  }
}