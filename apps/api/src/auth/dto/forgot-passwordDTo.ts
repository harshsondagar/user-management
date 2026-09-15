import { Injectable } from "@nestjs/common";
import { IsEmail, IsNotEmpty } from "class-validator";

@Injectable()
export class ForgotPasswordDto {
    @IsEmail({}, { message: 'please enter a valid email address' })
    @IsNotEmpty()
    declare email: string

}