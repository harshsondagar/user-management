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
import { Role } from './role-entity';
import { Permission } from './permission-entity';

@Entity('role_permissions')
@Unique('uq_role_permissions_role_id_permission_id', ['roleId', 'permissionId'])
export class RolePermission {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index('idx_role_permissions_role_id')
    @Column({ name: 'role_id', type: 'uuid' })
    roleId!: string;

    @ManyToOne(() => Role, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role!: Role;

    @Index('idx_role_permissions_permission_id')
    @Column({ name: 'permission_id', type: 'uuid' })
    permissionId!: string;

    @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission!: Permission;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}