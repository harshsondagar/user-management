import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateRoomDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean

    @IsOptional()
    @IsInt()
    @Min(2)
    @Max(50)
    maxUsers?: number
}