import { IsUUID, IsIn, IsInt, Max } from 'class-validator';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class PresignUploadDto {
    @IsUUID()
    declare roomId: string;

    @IsIn(ALLOWED_MIME_TYPES)
    declare mimeType: string;

    @IsInt()
    @Max(15 * 1024 * 1024) // 15MB cap
    declare fileSize: number;
}