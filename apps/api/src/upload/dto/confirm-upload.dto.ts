import { IsUUID, IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from 'class-validator';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class ConfirmUploadDto {
    @IsUUID()
    declare roomId: string;

    @IsString()
    @IsNotEmpty()
    declare objectKey: string;

    @IsIn(ALLOWED_MIME_TYPES)
    declare mimeType: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    caption?: string;
}