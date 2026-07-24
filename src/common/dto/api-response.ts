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
    data?: T;

    constructor(partial: Partial<ApiResponseDto<T>>) {
        Object.assign(this, partial);
    }
}