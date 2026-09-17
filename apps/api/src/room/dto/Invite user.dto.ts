import { IsUUID } from "class-validator";

export class InviteUserDto {
    @IsUUID()
    invitedUserId!: string
}