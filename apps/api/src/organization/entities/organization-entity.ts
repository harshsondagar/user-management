import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Member } from './members-entity';

export enum OrgStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

export enum OrganizationType {
    PERSONAL = 'personal',
    TEAM = 'team',
}

@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    declare id: string;

    @Column({ name: 'organization_name', length: 100, type: 'varchar' })
    declare organizationName: string;

    @Column({ name: 'type', type: 'enum', enum: OrganizationType })
    declare type: OrganizationType;

    @Column({ name: 'owner_user_id', type: 'uuid' })
    declare ownerUserId: string;

    @Column({ name: 'status', type: 'enum', enum: OrgStatus, default: OrgStatus.ACTIVE })
    declare status: OrgStatus;

    @OneToMany(() => Member, (member) => member.organization)
    declare members: Member[];

    @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true })
    declare stripeCustomerId: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    declare createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    declare updatedAt: Date;
}