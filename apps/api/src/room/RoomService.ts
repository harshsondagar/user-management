import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { Room, RoomBan, RoomInvite, RoomInviteLink } from "@app/shared";
import { CreateRoomDto } from "./dto/create.room.dto";
import { CreateInviteLinkDto } from "./dto/creat-invite-link.dto";
import { RoomRepositories } from "./repositories/room.reposetory";
import { RoomInviteRepositories } from "./repositories/room-invite.reposetory";
import { RoomBanRepositories } from "./repositories/room.ban.reposetory";
import { RoomInviteLinkRepositories } from "./repositories/room-invite-link.repository";

// Deliberately excludes visually-confusable characters (0/O, 1/I/L) so a
// code read aloud, handwritten, or typed on mobile doesn't get mistyped.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

function generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
}

// 9 random bytes -> 12 url-safe chars, ~72 bits of entropy. Unlike the room
// code (small space, needs a collision-retry loop), this is large enough
// that a collision is not a realistic concern, so no retry loop here.
function generateInviteToken(): string {
    return randomBytes(9).toString('base64url');
}

// Postgres's error code for a unique constraint violation.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class RoomService {
    constructor(
        private readonly roomRepo: RoomRepositories,
        private readonly inviteRepo: RoomInviteRepositories,
        private readonly banRepo: RoomBanRepositories,
        private readonly inviteLinkRepo: RoomInviteLinkRepositories,
    ) { }

    async createRoom(ownerId: string, dto: CreateRoomDto): Promise<Room> {
        for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            const code = generateCode();

            try {
                return await this.roomRepo.create({
                    name: dto.name,
                    code,
                    ownerId,
                    isPrivate: dto.isPrivate ?? false,
                    maxUsers: dto.maxUsers ?? 10,
                });
            } catch (err: any) {
                if (err?.code === PG_UNIQUE_VIOLATION) continue;
                throw err;
            }
        }

        throw new InternalServerErrorException(
            'Could not generate a unique room code - please try again',
        );
    }

    async findRoomOrThrow(roomId: string): Promise<Room> {
        const room = await this.roomRepo.findOne({ where: { id: roomId } as any });
        if (!room) throw new NotFoundException('Room not found');
        return room;
    }

    async findRoomByCodeOrThrow(code: string): Promise<Room> {
        const room = await this.roomRepo.findOne({ where: { code: code.toUpperCase() } as any });
        if (!room) throw new NotFoundException('Room not found');
        return room;
    }

    async getRoomForUser(roomId: string, userId: string): Promise<Room> {
        const room = await this.findRoomOrThrow(roomId);
        await this.assertVisible(room, userId);
        return room;
    }

    async getRoomByCodeForUser(code: string, userId: string): Promise<Room> {
        const room = await this.findRoomByCodeOrThrow(code);
        await this.assertVisible(room, userId);
        return room;
    }

    listPublicRooms(): Promise<Room[]> {
        return this.roomRepo.findAll({ where: { isPrivate: false } as any, order: { createdAt: 'DESC' } as any });
    }

    async deleteRoom(roomId: string): Promise<void> {
        await this.roomRepo.delete(roomId);
    }

    async inviteUser(roomId: string, invitedUserId: string, invitedBy: string): Promise<RoomInvite> {
        const existing = await this.inviteRepo.findOne({ where: { roomId, invitedUserId } as any });
        if (existing) return existing;

        return this.inviteRepo.create({ roomId, invitedUserId, invitedBy } as any);
    }

    async revokeInvite(roomId: string, invitedUserId: string): Promise<void> {
        await this.inviteRepo.deleteBy({ roomId, invitedUserId } as any);
    }

    async banUser(roomId: string, bannedUserId: string, bannedBy: string, reason?: string): Promise<RoomBan> {
        await this.inviteRepo.deleteBy({ roomId, invitedUserId: bannedUserId } as any);

        const existing = await this.banRepo.findOne({ where: { roomId, bannedUserId } as any });
        if (existing) return existing;

        return this.banRepo.create({ roomId, bannedUserId, bannedBy, reason } as any);
    }

    async unbanUser(roomId: string, bannedUserId: string): Promise<void> {
        await this.banRepo.deleteBy({ roomId, bannedUserId } as any);
    }

    // --- Invite links (Discord-style: shareable, redeemed by whoever opens them) ---

    async createInviteLink(roomId: string, createdBy: string, dto: CreateInviteLinkDto): Promise<RoomInviteLink> {
        const token = generateInviteToken();
        const expiresAt = dto.expiresInMinutes
            ? new Date(Date.now() + dto.expiresInMinutes * 60_000)
            : null;

        return this.inviteLinkRepo.create({
            roomId,
            token,
            createdBy,
            maxUses: dto.maxUses ?? null,
            expiresAt,
        } as any);
    }

    async listInviteLinks(roomId: string): Promise<RoomInviteLink[]> {
        return this.inviteLinkRepo.findAll({ where: { roomId, isActive: true } as any });
    }

    async revokeInviteLink(roomId: string, linkId: string): Promise<void> {
        await this.inviteLinkRepo.deleteBy({ id: linkId, roomId } as any);
    }

    // Anyone authenticated can call this with a token - identity isn't known
    // ahead of time, which is the whole point of a link vs. inviteUser().
    async redeemInviteLink(token: string, userId: string): Promise<Room> {
        const link = await this.inviteLinkRepo.findOne({ where: { token } as any });
        if (!link || !link.isActive) {
            throw new NotFoundException('This invite link is invalid or has been revoked');
        }
        if (link.expiresAt && link.expiresAt < new Date()) {
            throw new ForbiddenException('This invite link has expired');
        }
        if (link.maxUses != null && link.useCount >= link.maxUses) {
            throw new ForbiddenException('This invite link has reached its use limit');
        }

        const room = await this.findRoomOrThrow(link.roomId);

        // A ban always wins - redeeming a link can't be used to get back
        // into a room you were kicked from.
        const banned = await this.banRepo.findOne({ where: { roomId: room.id, bannedUserId: userId } as any });
        if (banned) throw new ForbiddenException('You are banned from this room');

        await this.inviteUser(room.id, userId, link.createdBy);
        await this.inviteLinkRepo.updateBy({ id: link.id } as any, { useCount: link.useCount + 1 } as any);

        return room;
    }

    private async assertVisible(room: Room, userId: string): Promise<void> {
        const banned = await this.banRepo.findOne({ where: { roomId: room.id, bannedUserId: userId } as any });
        if (banned) throw new ForbiddenException('You are banned from this room');

        if (!room.isPrivate) return;
        if (room.ownerId === userId) return;

        const invited = await this.inviteRepo.findOne({ where: { roomId: room.id, invitedUserId: userId } as any });
        if (!invited) throw new ForbiddenException('This room is private');
    }
}