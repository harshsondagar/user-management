import { IsString, Length, IsOptional } from 'class-validator';

export class UpdateOrganizationDto {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    organizationName?: string;
}