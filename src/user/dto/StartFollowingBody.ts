import { IsNotEmpty, IsOptional, IsString } from "class-validator";



export class StartFollowingBody {

    @IsString()
    @IsNotEmpty()

    declare followingId: string
}