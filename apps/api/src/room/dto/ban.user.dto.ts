import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class BanUserDto {
    @IsUUID()
    userId!: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string
}