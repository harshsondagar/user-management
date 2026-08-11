import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";



@Entity('system')
export class System {
    @PrimaryColumn({ type: 'varchar' })
    declare Key: string

    @Column({ type: "boolean" })
    declare value: string

}