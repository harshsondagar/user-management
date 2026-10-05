import { IsString, Length, IsOptional, IsArray, ArrayMinSize, IsString as IsStringItem } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @Length(1, 50)
    roleName!: string;

    @IsOptional()
    @IsString()
    @Length(0, 255)
    description?: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsStringItem({ each: true })
    permissionKeys!: string[];
}