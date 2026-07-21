import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Task } from "../../task/task-entity";

@Exclude()

export class UserResponseDto {
    @Expose()
    @ApiProperty()
    declare id: string

    @Expose()
    @ApiProperty()
    declare firstName: string

    @Expose()
    @ApiProperty()
    declare lastName: string

    @Expose()
    @ApiProperty()
    declare email: string

    @Expose()
    @ApiProperty()
    declare Task: Task[]
}