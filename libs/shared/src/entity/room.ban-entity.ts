import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Room } from "./room-entity";

@Entity('room_bans')
@Unique(['roomId', 'bannedUserId']) // a user can only have one active ban record per room
export class RoomBan {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'uuid' })
    declare roomId: string

    @ManyToOne(() => Room, (room) => room.bans, { onDelete: 'CASCADE' })
    declare room: Room

    @Index()
    @Column({ type: 'uuid' })
    declare bannedUserId: string

    @Column({ type: 'uuid' })
    declare bannedBy: string

    @Column({ type: 'varchar', nullable: true })
    declare reason?: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date
}