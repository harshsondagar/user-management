import { IsString, IsNotEmpty } from 'class-validator';

export class JoinRoomDto {
    @IsString() @IsNotEmpty() roomId!: string;
}

import { IsNumber } from 'class-validator';

export class MoveDto {
    @IsNumber() x!: number;
    @IsNumber() y!: number;
}