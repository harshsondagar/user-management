import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserResponseDto } from './user-response-dto';

export class LoginResponse extends PickType(UserResponseDto, ['id', 'firstName']) {
    @Expose()
    @ApiProperty()
    declare accessToken: string;

    constructor(partial: Partial<LoginResponse>) {
        super();
        Object.assign(this, partial);
    }
}