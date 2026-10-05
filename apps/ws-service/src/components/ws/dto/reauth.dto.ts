import { IsNotEmpty, IsString } from "class-validator";

export class ReauthDto {
    @IsString() @IsNotEmpty() token!: string;
}