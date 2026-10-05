import { IsString, Length } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @Length(1, 100)
    organizationName!: string;
}