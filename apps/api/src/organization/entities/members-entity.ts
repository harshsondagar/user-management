import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../user/entity/user-entity';
import { Organization } from './organization-entity';

export enum MemberStatus {
    INVITED = 'invited', // row exists before the invite is accepted
    ACTIVE = 'active',
    REMOVED = 'removed', // kept, not deleted, for audit history
}

@Entity('members')
@Unique('uq_members_user_id_organization_id', ['userId', 'organizationId'])
export class Member {
    @PrimaryGeneratedColumn('uuid')
    declare id: string;

    @Index('idx_members_user_id')
    @Column({ name: 'user_id', type: 'uuid' })
    declare userId: string;

    @ManyToOne(() => User, (user) => user.member, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    declare user: User;

    @Index('idx_members_organization_id')
    @Column({ name: 'organization_id', type: 'uuid' })
    declare organizationId: string;

    @ManyToOne(() => Organization, (organization) => organization.members, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'organization_id' })
    declare organization: Organization;

    @Column({ name: 'status', type: 'enum', enum: MemberStatus, default: MemberStatus.INVITED })
    declare status: MemberStatus;

    @Column({ name: 'invited_by_user_id', type: 'uuid', nullable: true })
    declare invitedByUserId: string | null;

    @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
    declare joinedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    declare createdAt: Date;
}