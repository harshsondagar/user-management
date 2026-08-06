// src/dlq/entities/dead-letter-entry.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum FailureScope {
    RESOURCE = 'resource',
    JOB = 'job',
    SEARCH = 'search',
}

export enum DlqStatus {
    PENDING_RETRY = 'pending_retry',
    PERMANENTLY_FAILED = 'permanently_failed',
    RESOLVED = 'resolved',
    IGNORED = 'ignored',
}

@Entity('dead_letter_entries')
export class DeadLetterEntry {
    @PrimaryGeneratedColumn('uuid')
    declare id: string;

    @Column({ type: 'enum', enum: FailureScope })
    @Index()
    declare failureScope: FailureScope;

    @Column({ type: 'enum', enum: DlqStatus, default: DlqStatus.PENDING_RETRY })
    @Index()
    declare status: DlqStatus;

    // --- resource-scope fields (nullable for job-scope rows) ---
    @Column({ type: 'varchar', nullable: true })
    @Index()
    declare resourceId: string | null;

    @Column({ type: 'bigint', nullable: true })
    @Index()
    declare nid: number | null;

    @Column({ type: 'varchar', nullable: true })
    declare title: string | null;

    @Column({ type: 'varchar', nullable: true })
    declare query: string | null;

    // --- job-scope fields (nullable for resource-scope rows) ---
    @Column({ type: 'varchar', nullable: true })
    declare bullJobId: string | null;

    @Column({ type: 'varchar', nullable: true })
    declare userId: string | null;

    // --- shared fields ---
    @Column({ type: 'text' })
    declare errorMessage: string;

    @Column({ type: 'text', nullable: true })
    declare errorStack: string | null;

    @Column({ type: 'text', nullable: true })
    declare retryErrorMessage: string | null;

    @Column({ type: 'int', default: 1 })
    declare attemptCount: number;

    @Column({ type: 'jsonb', nullable: true })
    declare rawContext: Record<string, any> | null; // dump anything else useful for debugging

    @CreateDateColumn()
    declare firstFailedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    declare lastAttemptedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    declare notifiedAt: Date | null;

    @Column({ type: 'varchar', nullable: true })
    declare resolvedBy: string | null;

    @Column({ type: 'timestamp', nullable: true })
    declare resolvedAt: Date | null;

    @UpdateDateColumn()
    declare updatedAt: Date;
}
