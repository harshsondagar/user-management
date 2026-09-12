import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

@Entity('chat_messages')
export class ChatMessage {

    @PrimaryColumn({ type: 'uuid' })
    declare id: string

    @Index()
    @Column({ type: 'uuid' })
    declare roomId: string

    @Column({ type: 'uuid' })
    declare userId: string

    @Column({ type: 'varchar', length: 2000 })
    declare content: string

    // Set by ws-service at receipt time, not @CreateDateColumn (which would
    // stamp whenever the batch happens to actually flush - could be ~1s
    // later than when the message was really sent).
    @Column({ type: 'timestamptz' })
    declare sentAt: Date

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date
}