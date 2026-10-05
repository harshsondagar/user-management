import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

export enum ChatMessageType {
    TEXT = 'text',
    IMAGE = 'image',
}

export enum ChatMessageStatus {
    SENT = 'sent',       // text messages, or default
    PROCESSING = 'processing', // image uploaded, still generating variants
    READY = 'ready',      // image variants ready
    FAILED = 'failed',
}

export interface ChatAttachment {
    bucket: string;
    originalKey: string;
    thumbKey?: string;
    previewKey?: string;
    blurhash?: string;
    width?: number;
    height?: number;
    size: number;
    mimeType: string;
}

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryColumn({ type: 'uuid' })
    declare id: string

    @Index()
    @Column({ type: 'uuid' })
    declare roomId: string

    @Column({ type: 'uuid' })
    declare userId: string

    // Nullable now: image messages may have no caption
    @Column({ type: 'varchar', length: 2000, nullable: true })
    declare content: string | null

    @Column({ type: 'enum', enum: ChatMessageType, default: ChatMessageType.TEXT })
    declare type: ChatMessageType

    @Column({ type: 'enum', enum: ChatMessageStatus, default: ChatMessageStatus.SENT })
    declare status: ChatMessageStatus

    // jsonb, not a joined table — keeps the room history query a single SELECT
    @Column({ type: 'jsonb', nullable: true })
    declare attachment: ChatAttachment | null

    @Column({ type: 'timestamptz' })
    declare sentAt: Date

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date
}