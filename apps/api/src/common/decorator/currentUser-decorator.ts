import { User } from "@app/shared";
import { createParamDecorator, ExecutionContext, } from "@nestjs/common";;


export const currentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
    const { user } = ctx.switchToHttp().getRequest()
    return user as User
})  