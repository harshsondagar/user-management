import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { RoomInvite } from "./room.invite-entity";
import { RoomBan } from "./room.ban-entity";
import { RoomInviteLink } from "./room-invite-link-entity";

@Entity('rooms')
export class Room {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'varchar', length: 100 })
    declare name: string

    // Short, shareable, unique code used for invites/joining - separate from
    // the display name on purpose, so "Dragon's Lair" can exist a hundred
    // times over but each one still has one unambiguous code to invite
    // someone with (e.g. "7XQK2P"). Generated app-side with a collision
    // retry, not a DB default - see RoomsService.createRoom() in Batch 2.
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 10 })
    declare code: string

    // Plain uuid column, not a @ManyToOne(() => User, ...) relation - the
    // User entity lives inside apps/api, and we deliberately don't want
    // ws-service pulling in the full User entity (and everything IT
    // relates to - tasks, followers, etc.) just to reference an owner id.
    // The JWT is already the source of truth for "who is this user".
    @Column({ type: 'uuid' })
    declare ownerId: string

    @Column({ type: 'boolean', default: false })
    declare isPrivate: boolean

    @Column({ type: 'int', default: 10 })
    declare maxUsers: number

    @OneToMany(() => RoomInvite, (invite) => invite.room)
    declare invites: RoomInvite[]

    @OneToMany(() => RoomBan, (ban) => ban.room)
    declare bans: RoomBan[]

    @OneToMany(() => RoomInviteLink, (link) => link.room)
    declare inviteLinks: RoomInviteLink[]

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date

    @UpdateDateColumn({ type: 'timestamptz', nullable: true })
    declare updatedAt: Date
}