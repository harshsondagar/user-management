import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../user/user-entity";

export enum TaskStatus {
    PENDING = 'pending',
    DONE = "done",
    CANCEL = 'CANCELLED',
}
@Entity('tasks')

export class Task {

    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: "varchar", length: 100 })
    declare name: string

    @Column({ type: "varchar" })
    declare description: string

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "userId" })
    declare user: User

    @Column({ type: 'uuid' })
    declare userId: string

    @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
    declare isCompleted: TaskStatus

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date

    @UpdateDateColumn({ type: 'timestamptz' })
    declare updatedAt: Date

    @DeleteDateColumn({ type: 'timestamptz' })
    declare deletedAt: Date
}