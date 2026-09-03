import "dotenv/config"
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './service/room-service';
import { Logger, UseGuards } from '@nestjs/common';
import { JoinRoomDto } from './dto/join-room.dto';
import { MoveDto } from './dto/move-dto';
import { ChatDto } from './dto/chat-dto';
import { ChatHandler } from './handle/chat.handler';
import { JwtService } from '@nestjs/jwt';
import { WsAuthGuard } from './guard/ws-auth.guard';


@WebSocketGateway(8080, {
  cors: { origin: '*' }
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name)
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rooms: RoomsService,
    private readonly chatHandler: ChatHandler,
    private readonly jwt: JwtService,
  ) { }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
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
    const userId = client.data.userId;
    const username = client.data.username;
    try {
      const user = this.rooms.join(dto.roomId, username, userId, client.id);

      client.join(dto.roomId);

      client.emit('room_state', { users: this.rooms.getRoomUsers(dto.roomId) });

      client.to(dto.roomId).emit('user_joined', user);
    } catch (err) {
      client.emit('join_error', { message: (err as Error).message });
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
    if (!info) return;
    this.server.to(info.roomId).emit('user_left', { userId: info.userId });

    this.logger.log(`ws-service user disconnected client: ${client.id}`);
  }
}
