import {
    IsString,
    Length,
    IsOptional,
    IsBoolean,
    IsInt,
    Min,
    Max,
    IsUrl,
} from 'class-validator';

export class CreateProfileDto {
    @IsString()
    @Length(1, 50)
    profileName!: string;

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;

    @IsOptional()
    @IsBoolean()
    isKidsProfile?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    maturityLevel?: number;

    @IsOptional()
    @IsString()
    @Length(2, 10)
    language?: string;

    @IsOptional()
    @IsString()
    @Length(2, 10)
    subtitleLanguage?: string;

    @IsOptional()
    @IsString()
    @Length(1, 20)
    uiTheme?: string;
}