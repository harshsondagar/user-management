import { Inject, Injectable } from "@nestjs/common";
import { Direction } from "../dto/move-dto";
import { EventEmitter } from "events";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../../../redis/redis.provider";

interface User {
    username: string;
    userId: string;
    socketId: string;
    x: number;
    y: number;
    lastSeenAt: number;
    isIdle: boolean;
}

interface Room {
    roomId: string;
    users: Map<string, User>;
    maxUsers?: number;
    createdAt?: number;
}

type SocketIndex = Map<string, { userId: string; roomId: string }>;

@Injectable()
export class RoomsService extends EventEmitter {
    private rooms = new Map<string, Room>()
    private socketIndex: SocketIndex = new Map();
    private userRoomIndex = new Map<string, string>();
    private disconnectTimers = new Map<string, NodeJS.Timeout>()
    private idleWarningTimers = new Map<string, NodeJS.Timeout>();

    private readonly STEP = 1
    private readonly deltas: Record<Direction, { dx: number; dy: number }> = {
        [Direction.UP]: { dx: 0, dy: -1 },
        [Direction.DOWN]: { dx: 0, dy: 1 },
        [Direction.LEFT]: { dx: -1, dy: 0 },
        [Direction.RIGHT]: { dx: 1, dy: 0 },
    };

    private readonly GRACE_PERIOD_MS = 15_000;
    private readonly MAP_WIDTH = 500;
    private readonly MAP_HEIGHT = 500;


    private readonly IDLE_WARNING_MS = 60_000
    private readonly IDLE_DISCONNECT_MS = 30_000
    private idleSweepInterval: NodeJS.Timeout;



    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
        super();
        this.idleSweepInterval = setInterval(() => this.runIdleSweep(), 15_000);
    }


    private getOrCreateRoom(roomId: string): Room {
        if (!this.rooms.get(roomId)) {
            this.rooms.set(roomId, {
                roomId,
                users: new Map(),
                maxUsers: 10,
                createdAt: Date.now()
            })
        }
        return this.rooms.get(roomId)!;
    }

    private roomUsersKey(roomId: string): string {
        return `room:${roomId}:users`;
    }

    async join(roomId: string, username: string, userId: string, socketId: string): Promise<{ user: User, reconnected: boolean }> {
        const previousRoomId = this.userRoomIndex.get(userId);

        if (previousRoomId && previousRoomId !== roomId) {
            this.forceRemove(userId, previousRoomId);
        }

        const room = this.getOrCreateRoom(roomId);
        const existing = room.users.get(userId);
        if (existing) {
            const key = this.timerKey(roomId, userId);
            const timer = this.disconnectTimers.get(key)

            if (timer) {
                clearTimeout(timer)
                this.disconnectTimers.delete(key)
            }
            existing.socketId = socketId
            this.socketIndex.set(socketId, { userId, roomId })
            this.userRoomIndex.set(userId, roomId);
            return { user: existing, reconnected: true };
        }

        if (room.maxUsers && room.users.size >= room.maxUsers) {
            throw new Error('Room is full');
        }

        const { x, y } = this.spawnPosition(room);
        const user: User = { username, userId, socketId, x, y, lastSeenAt: Date.now(), isIdle: false };

        room.users.set(userId, user);
        this.socketIndex.set(socketId, { userId, roomId });
        this.userRoomIndex.set(userId, roomId);

        await this.redis.hset(this.roomUsersKey(roomId), userId, JSON.stringify({ username, x, y }));

        return { user, reconnected: false };
    }

    leave(socketId: string) {
        const info = this.socketIndex.get(socketId);
        if (!info) return null;
        this.socketIndex.delete(socketId);

        const key = this.timerKey(info.roomId, info.userId);
        const timer = setTimeout(() => {
            const room = this.rooms.get(info.roomId);
            room?.users.delete(info.userId);
            this.disconnectTimers.delete(key);
            if (room && room.users.size === 0) this.rooms.delete(info.roomId);
            this.userRoomIndex.delete(info.userId);
            this.emit('user-timed-out', info)
        }, this.GRACE_PERIOD_MS);

        this.disconnectTimers.set(key, timer);
        return info
    }

    private timerKey(roomId: string, userId: string) {
        return `${roomId}:${userId}`;
    }

    move(socketId: string, direction: Direction): { userId: string; roomId: string; x: number; y: number } | null {

        const info = this.socketIndex.get(socketId);

        if (!info) return null;

        const user = this.rooms.get(info.roomId)?.users.get(info.userId);
        if (!user) return null;

        const { dx, dy } = this.deltas[direction];
        user.x = this.clamp(user.x + dx * this.STEP, 0, this.MAP_WIDTH);
        user.y = this.clamp(user.y + dy * this.STEP, 0, this.MAP_HEIGHT);

        return { ...info, x: user.x, y: user.y };
    }



    private clamp(v: number, min: number, max: number): number {
        return Math.floor(Math.min(Math.max(v, min), max));
    }

    private async forceRemove(userId: string, roomId: string) {
        const warningTimer = this.idleWarningTimers.get(userId);
        if (warningTimer) {
            clearTimeout(warningTimer);
            this.idleWarningTimers.delete(userId);
        }

        const key = this.timerKey(roomId, userId);
        const timer = this.disconnectTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
        }

        const room = this.rooms.get(roomId);
        room?.users.delete(userId);
        if (room && room.users.size === 0) this.rooms.delete(roomId);
        await this.redis.hdel(this.roomUsersKey(roomId), userId);

        this.emit('user-timed-out', { userId, roomId });
    }

    getUser(roomId: string, userId: string): User | undefined {
        return this.rooms.get(roomId)?.users.get(userId);
    }

    findBySocketId(socketId: string): User | undefined {
        const info = this.socketIndex.get(socketId);
        if (!info) return undefined;
        return this.rooms.get(info.roomId)?.users.get(info.userId);
    }

    getRoomUsers(roomId: string): User[] {
        return Array.from(this.rooms.get(roomId)?.users.values() ?? []);
    }

    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }


    getRoomIdBySocket(socketId: string): { userId: string; roomId: string } | undefined {
        return this.socketIndex.get(socketId);
    }

    leaveRoom(userId: string, roomId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room || !room.users.has(userId)) return false;

        this.forceRemove(userId, roomId);
        this.userRoomIndex.delete(userId);
        return true;
    }

    private randomCoord(min = 0, max = 100): number {
        return Math.round(Math.random() * (max - min) + min);
    }

    private spawnPosition(room: Room): { x: number; y: number } {
        const existing = Array.from(room.users.values());

        if (existing.length === 0) {
            return { x: this.randomCoord(), y: this.randomCoord() };
        }

        const anchor = existing[Math.floor(Math.random() * existing.length)];
        const angle = Math.random() * 2 * Math.PI;   // random direction
        const radius = 5 + Math.random() * 10;        // 5–15 units away, avoids exact overlap

        const x = this.clamp(Math.round(anchor.x + Math.cos(angle) * radius), 0, this.MAP_WIDTH);
        const y = this.clamp(Math.round(anchor.y + Math.sin(angle) * radius), 0, this.MAP_HEIGHT);

        return { x, y };
    }

    touchLastSeen(socketId: string): void {
        const info = this.socketIndex.get(socketId);
        if (!info) return;
        const user = this.rooms.get(info.roomId)?.users.get(info.userId);
        if (!user) return;

        user.lastSeenAt = Date.now();

        if (user.isIdle) {
            user.isIdle = false;
            this.emit('user-idle-changed', { roomId: info.roomId, userId: info.userId, isIdle: false });

            const timer = this.idleWarningTimers.get(info.userId);
            if (timer) {
                clearTimeout(timer);
                this.idleWarningTimers.delete(info.userId);
            }
        }
    }

    async getGlobalRoomUsers(roomId: string): Promise<Array<{ userId: string; username: string; x: number; y: number }>> {
        const raw = await this.redis.hgetall(this.roomUsersKey(roomId));
        return Object.entries(raw).map(([userId, json]) => ({
            userId,
            ...JSON.parse(json),
        }));
    }

    runIdleSweep(): void {
        const now = Date.now();

        for (const room of this.rooms.values()) {
            for (const user of room.users.values()) {
                const idleFor = now - user.lastSeenAt!;

                if (!user.isIdle && idleFor > this.IDLE_WARNING_MS) {
                    user.isIdle = true;
                    this.emit('user-idle-changed', { roomId: room.roomId, userId: user.userId, isIdle: true });
                    this.startIdleDisconnectTimer(user.userId, room.roomId, user.socketId);
                }
            }
        }
    }

    private startIdleDisconnectTimer(userId: string, roomId: string, socketId: string): void {
        const timer = setTimeout(() => {
            this.idleWarningTimers.delete(userId);
            // still idle and still the same connection? then time's up
            const room = this.rooms.get(roomId);
            const user = room?.users.get(userId);
            if (user && user.isIdle && user.socketId === socketId) {
                this.emit('user-idle-kicked', { roomId, userId, socketId });
            }
        }, this.IDLE_DISCONNECT_MS);

        this.idleWarningTimers.set(userId, timer);
    }

    onModuleDestroy() {
        clearInterval(this.idleSweepInterval);
    }

}