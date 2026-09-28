import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../user/entity/user-entity";

@Entity("RefreshToken")

export class RefreshToken {

    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Index()
    @Column({ type: 'varchar' })
    declare tokenHash: string

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    declare user: User

    @Column({ type: 'uuid' })
    declare userId: string

    @Index()
    @Column({ type: "uuid" })
    declare familyId: string

    @Column({ type: 'boolean', default: false })
    declare revoked: boolean

    @Column({ type: 'timestamptz' })
    declare expireAt: Date

    @Column({ type: 'timestamptz' })
    declare absoluteExpiry: Date

    @Column({ type: "varchar", nullable: true })
    declare userAgent: string

    @Column({ type: "varchar", nullable: true })
    declare ipAddress: string

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt?: Date

    @UpdateDateColumn({ type: 'timestamptz', nullable: true })
    declare updatedAt: Date

    @Column({ name: "active_profile_id", type: 'uuid', nullable: true })
    declare active_profile_id: string
}