import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Organization } from './organization-entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid', { name: 'role_id' })
    roleId!: string;

    @Index('idx_roles_organization_id')
    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId!: string | null;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'organization_id' })
    organization?: Organization | null;

    @Column({ name: 'role_name', type: 'varchar', length: 50 })
    roleName!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description?: string | null;

    @Column({ name: 'is_system', type: 'boolean', default: false })
    isSystem!: boolean;

    @Column({ default: false })
    isDefaultClone: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}