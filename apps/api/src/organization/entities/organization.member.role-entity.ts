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
import { Member } from './members-entity';
import { Role } from './role-entity';

/**
 * Explicit join entity rather than a plain @ManyToMany/@JoinTable (like
 * Role<->Permission uses) - deliberately, so WHO assigned a role and
 * WHEN is preserved for audit purposes. Role<->Permission doesn't need
 * that history; who-has-what-role in an org very much does.
 */
@Entity('organization_member_roles')
@Unique('uq_org_member_roles_member_id_role_id', ['memberId', 'roleId'])
export class OrganizationMemberRole {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index('idx_org_member_roles_member_id')
    @Column({ name: 'member_id', type: 'uuid' })
    memberId!: string;

    @ManyToOne(() => Member, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'member_id' })
    member!: Member;

    @Index('idx_org_member_roles_role_id')
    @Column({ name: 'role_id', type: 'uuid' })
    roleId!: string;

    @ManyToOne(() => Role, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role!: Role;

    @Column({ name: 'assigned_by_user_id', type: 'uuid', nullable: true })
    assignedByUserId!: string | null;

    @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
    assignedAt!: Date;
}