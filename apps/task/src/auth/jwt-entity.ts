import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../user/user-entity";

@Entity("RefreshToken")

export class RefreshToken {

    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Index()
    @Column({ type: 'varchar' })
    declare tokenHash: string

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
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

    @Column({ type: Date })
    declare absoluteExpiry: Date

    @Column({ type: "varchar", nullable: true })
    declare userAgent: string

    @Column({ type: "varchar", nullable: true })
    declare ipAddress: string

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt?: Date

    @UpdateDateColumn({ type: 'timestamptz', nullable: true })
    declare updatedAt: Date
}