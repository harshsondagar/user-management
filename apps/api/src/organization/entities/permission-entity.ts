import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn('uuid', { name: 'permission_id' })
    permissionId!: string;

    @Column({ name: 'permission_key', type: 'varchar', length: 100, unique: true })
    key!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description?: string | null;
}