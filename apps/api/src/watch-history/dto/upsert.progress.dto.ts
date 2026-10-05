import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class UpsertProgressDto {
    @IsInt()
    @Min(0)
    progressSeconds!: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    durationSeconds?: number;

    @IsOptional()
    @IsBoolean()
    completed?: boolean;
}