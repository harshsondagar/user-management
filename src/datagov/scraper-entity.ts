import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";



// export enum UserRole {
//     USER = 'user',
//     ADMIN = 'admin',
//     SUPER_ADMIN = "super_admin"
// }

// export enum ProfileType {
//     PRIVATE = "private",
//     PUBLIC = "public",
//     FRIENDS_ONLY = "friends_only",
// }

@Entity('Scrap')
export class Scrap {
    @PrimaryGeneratedColumn('uuid')
    declare id: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    declare firstName?: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    declare lastName?: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    declare elName?: string

    @Column({ type: 'boolean' })
    declare isActive: string
}


