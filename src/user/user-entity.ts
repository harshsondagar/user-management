import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Task } from "../task/task-entity";
import { Followers } from "./userfollowers-entity";


export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = "super_admin"
}

export enum ProfileType {
    PRIVATE = "private",
    PUBLIC = "public",
    FRIENDS_ONLY = "friends_only",
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

    @Column({ type: "enum", enum: ProfileType, default: ProfileType.PRIVATE })
    declare profileVisibility: ProfileType



    @OneToMany(() => Followers, (follower) => follower.following)
    declare followers: Followers[]

    @OneToMany(() => Followers, (follower) => follower.followerId)
    declare following: Followers[]

    @OneToMany(() => Task, (Task) => Task.user)
    declare tasks: Task[]



    @CreateDateColumn({ type: "timestamptz" })
    declare createdAt: Date

    @UpdateDateColumn({ type: "timestamptz", nullable: true })
    declare updatedAt: Date

    @DeleteDateColumn()
    declare deletedAt: Date;
}


