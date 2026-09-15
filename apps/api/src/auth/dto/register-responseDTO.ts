import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { UserResponseDto } from './user-response-dto';


@Exclude()
export class RegisterResponseDTO extends PickType(UserResponseDto, ['id', 'email'] as const) { }