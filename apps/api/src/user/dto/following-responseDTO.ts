import { PickType } from "@nestjs/swagger";
import { StartFollowingBody } from "./StartFollowingBody";




export class StartFollowRequest extends PickType(StartFollowingBody, ['followingId']) { }