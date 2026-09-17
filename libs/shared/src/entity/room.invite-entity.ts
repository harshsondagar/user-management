import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Room } from "./room-entity";

@Entity('room_invites')
@Unique(['roomId', 'invitedUserId']) // a user can only be invited once per room
export class RoomInvite {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'uuid' })
    declare roomId: string

    @ManyToOne(() => Room, (room) => room.invites, { onDelete: 'CASCADE' })
    declare room: Room

    @Index()
    @Column({ type: 'uuid' })
    declare invitedUserId: string

    @Column({ type: 'uuid' })
    declare invitedBy: string

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date
}