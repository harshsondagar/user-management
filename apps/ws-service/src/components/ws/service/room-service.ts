import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import { Direction } from "../dto/move-dto";

interface User {
    username: string;
    userId: string;
    socketId: string;
    x: number;
    y: number;
}
interface Room {
    roomId: string;
    users: Map<string, User>;
    maxUsers?: number;
    createdAt?: number;
}

type SocketIndex = Map<string, { userId: string; roomId: string }>;

@Injectable()
export class RoomsService {
    private rooms = new Map<string, Room>()
    private socketIndex: SocketIndex = new Map();
    private readonly STEP = 1
    private readonly deltas: Record<Direction, { dx: number; dy: number }> = {
        [Direction.UP]: { dx: 0, dy: -1 },
        [Direction.DOWN]: { dx: 0, dy: 1 },
        [Direction.LEFT]: { dx: -1, dy: 0 },
        [Direction.RIGHT]: { dx: 1, dy: 0 },
    };

    private readonly MAP_WIDTH = 500;   // pick whatever fits your canvas
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

    join(roomId: string, username: string, userId: string, socketId: string): User {
        const room = this.getOrCreateRoom(roomId);

        if (room.maxUsers && room.users.size >= room.maxUsers) {
            throw new Error('Room is full');
        }

        const { x, y } = this.spawnPosition(room);
        const user: User = { username, userId, socketId, x, y };

        room.users.set(userId, user);
        this.socketIndex.set(socketId, { userId, roomId });
        return user;
    }

    leave(socketId: string) {
        const info = this.socketIndex.get(socketId);
        if (!info) return null;

        const room = this.rooms.get(info.roomId)
        const user = room?.users.get(info.userId);
        room?.users.delete(info.userId);
        this.socketIndex.delete(socketId);

        if (room && room.users.size === 0) {
            this.rooms.delete(info.roomId);
        }

        return user ? { ...info, username: user.username } : null;
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

}