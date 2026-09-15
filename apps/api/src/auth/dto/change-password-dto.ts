import { OmitType, PickType } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { ResetPasswordDTO } from "./ResetPasswordDTO";
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ChangeForgotPassword {

    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    @MaxLength(128)
    @Matches(/(?=.*[a-z])/, { message: 'Password must contain a lowercase letter' })
    @Matches(/(?=.*[A-Z])/, { message: 'Password must contain an uppercase letter' })
    @Matches(/(?=.*\d)/, { message: 'Password must contain a number' })
    @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Password must contain a special character' })
    declare newPassword: string

    @IsString()
    @IsNotEmpty()
    declare token: string
}