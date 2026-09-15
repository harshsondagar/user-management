import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user-entity";

export enum STATUS {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    BLOCK = "block"
}

@Entity('followers')
@Unique(["followerId", "followingId"])
@Index(['followingId'])
@Index(['followerId'])

export class Followers {

    @PrimaryGeneratedColumn('uuid')
    declare id: string


    @Column({ type: 'uuid', unique: true })
    declare followerId: string

    @ManyToOne(() => User, (user) => user.followers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followerId' })
    declare followers: User


    @Column({ type: 'uuid', unique: true })
    declare followingId: string

    @ManyToOne(() => User, (user) => user.following, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'followingId' })
    declare following: User


    @Column({ type: 'enum', enum: STATUS, default: STATUS.PENDING })
    declare status: STATUS

    @CreateDateColumn({ type: 'timestamptz' })
    declare createdAt: Date

}

