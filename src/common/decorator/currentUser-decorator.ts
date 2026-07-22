import { createParamDecorator, ExecutionContext, } from "@nestjs/common";
import { User } from "../../user/user-entity";


export const currentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
    const { user } = ctx.switchToHttp().getRequest()

    return user as User
})  