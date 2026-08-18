import { Request } from "express";
import { User } from "../../user/entity/user-entity";
import { createParamDecorator, ExecutionContext, } from "@nestjs/common";;


export const currentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
    const { user } = ctx.switchToHttp().getRequest<Request>()
    return user as User
})  