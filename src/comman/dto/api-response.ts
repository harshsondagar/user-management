import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ApiResponseDto<T> {
    @Expose()
    @ApiProperty()
    declare success: boolean;

    @Expose()
    @ApiProperty()
    declare message: string;

    @Expose()
    data?: T; // typed dynamically per-route via the decorator below

    constructor(partial: Partial<ApiResponseDto<T>>) {
        Object.assign(this, partial);
    }
}