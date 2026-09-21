import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization-entity';
import { Role } from './role-entity';

export enum InviteStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    EXPIRED = 'expired',
    REVOKED = 'revoked',
}

@Entity('organization_invites')
export class OrganizationInvite {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index('idx_org_invites_organization_id')
    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId!: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization!: Organization;

    @Index('idx_org_invites_email')
    @Column({ name: 'email', type: 'varchar' })
    email!: string;

    @Column({ name: 'role_id', type: 'uuid', nullable: true })
    roleId!: string | null;

    @ManyToOne(() => Role, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'role_id' })
    role?: Role | null;

    @Column({ name: 'invited_by_user_id', type: 'uuid' })
    invitedByUserId!: string;

    @Index('idx_org_invites_token_hash', { unique: true })
    @Column({ name: 'token_hash', type: 'varchar' })
    tokenHash!: string;

    @Column({
        name: 'status',
        type: 'enum',
        enum: InviteStatus,
        default: InviteStatus.PENDING,
    })
    status!: InviteStatus;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt!: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}