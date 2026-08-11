
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail()
    declare email: string;

    @IsString()
    @Length(6, 6)
    declare otp: string;
}