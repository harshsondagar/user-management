import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Room } from "./room-entity";

@Entity('room_invite_links')
export class RoomInviteLink {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'uuid' })
    declare roomId: string

    @ManyToOne(() => Room, (room) => room.inviteLinks, { onDelete: 'CASCADE' })
    declare room: Room

    // Longer/higher-entropy than Room.code on purpose: the room code is just
    // a discovery mechanism (still gated by isPrivate/invite/ban checks).
    // This token IS the access grant the moment someone redeems it, so it
    // needs to be hard to guess, not just short and shareable.
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 20 })
    declare token: string

    @Column({ type: 'uuid' })
    declare createdBy: string

    // null = unlimited uses (a persistent, Discord-style "permanent" invite link)
    @Column({ type: 'int', nullable: true })
    declare maxUses: number | null

    @Column({ type: 'int', default: 0 })
    declare useCount: number

    // null = never expires
    @Column({ type: 'timestamptz', nullable: true })
    declare expiresAt: Date | null

    // Lets an owner revoke a link without deleting its usage history
    @Column({ type: 'boolean', default: true })
    declare isActive: boolean

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date
}