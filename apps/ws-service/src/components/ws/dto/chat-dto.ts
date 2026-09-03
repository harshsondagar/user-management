// dto/chat.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatDto {
    @IsString() @IsNotEmpty() @MaxLength(500)
    message: string;
}