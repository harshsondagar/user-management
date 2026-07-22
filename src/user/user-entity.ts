import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Task } from "../task/task-entity";


export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    declare firstName?: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    declare lastName?: string

    @Index({ unique: true })
    @Column({ type: "varchar", length: 255 })
    declare email: string

    @Column({ type: "varchar", select: false })
    declare passwordHash: string

    @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
    declare role: UserRole

    @Column({ type: 'boolean', default: false })
    declare isEmailVerified: boolean

    @Column({ type: "int", default: 0 })
    declare failedLoginAttempts: number

    @Column({ type: "int", default: 0 })
    declare tokenVersion: number

    @Column({ type: 'timestamptz', nullable: true })
    declare lockedUntil: Date | null

    @Column({ type: 'boolean', default: false })
    declare isAdmin: boolean

    @CreateDateColumn({ type: "timestamptz" })
    declare createdAt: Date

    @UpdateDateColumn({ type: "timestamptz", nullable: true })
    declare updatedAt: Date

    @OneToMany(() => Task, (Task) => Task.user)
    declare tasks: Task[]
}


