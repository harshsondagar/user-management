import { IsOptional, IsString, Matches } from 'class-validator';

export class SelectProfileDto {
    @IsOptional()
    @IsString()
    @Matches(/^\d{4}$/, { message: 'pin must be exactly 4 digits' })
    pin?: string;
}