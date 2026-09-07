import { Injectable } from "@nestjs/common";
import { Direction } from "../dto/move-dto";
import { EventEmitter } from "events";

interface User {
    username: string;
    userId: string;
    socketId: string;
    x: number;
    y: number;
    lastSeenAt?: number;
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

    join(roomId: string, username: string, userId: string, socketId: string): { user: User, reconnected: boolean } {
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
        const user: User = { username, userId, socketId, x, y };

        room.users.set(userId, user);
        this.socketIndex.set(socketId, { userId, roomId });
        this.userRoomIndex.set(userId, roomId);

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

    private forceRemove(userId: string, roomId: string) {
        const key = this.timerKey(roomId, userId);
        const timer = this.disconnectTimers.get(key);

        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
        }

        const room = this.rooms.get(roomId);
        room?.users.delete(userId);
        if (room && room.users.size === 0) this.rooms.delete(roomId);

        this.emit('user-timed-out', { userId, roomId }); // reuse the same event — gateway broadcasts user_left
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

    private randomCoord(min = 0, max = 100): number {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }

    private spawnPosition(room: Room): { x: number; y: number } {
        const existing = Array.from(room.users.values());

        if (existing.length === 0) {
            return { x: this.randomCoord(), y: this.randomCoord() };
        }

        const anchor = existing[Math.floor(Math.random() * existing.length)];
        const angle = Math.random() * 2 * Math.PI;   // random direction
        const radius = 5 + Math.random() * 10;        // 5–15 units away, avoids exact overlap

        const x = Math.round((anchor.x + Math.cos(angle) * radius) * 100) / 100;
        const y = Math.round((anchor.y + Math.sin(angle) * radius) * 100) / 100;

        return { x, y };
    }

    touchLastSeen(socketId: string) {
        const info = this.socketIndex.get(socketId);
        if (!info) return;
        const user = this.rooms.get(info.roomId)?.users.get(info.userId);
        if (user) user.lastSeenAt = Date.now();
    }

}