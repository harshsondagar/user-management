import { IsNotEmpty, IsString } from "class-validator";


export class RedisSubscribeDto {
    @IsString() @IsNotEmpty() channel!: string
}