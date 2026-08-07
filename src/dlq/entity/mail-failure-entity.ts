import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('mail_failures')
export class MailFailure {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    @Index()
    jobName!: string; // e.g. 'send-email-verification-mail'

    @Column({ type: 'varchar' })
    @Index()
    recipientEmail!: string;

    @Column({ type: 'varchar' })
    bullJobId!: string;

    @Column({ type: 'text' })
    errorMessage!: string;

    @Column({ type: 'int' })
    attemptsMade!: number;

    @Column({ type: 'jsonb', nullable: true })
    jobData!: Record<string, any> | null;

    @CreateDateColumn()
    @Index()
    failedAt!: Date;
}
