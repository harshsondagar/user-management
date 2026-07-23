import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { IS_SUPER_ADMIN } from "../decorator/isAdmin-decoretor";
import { Request } from "express";
import { User, UserRole } from "../../user/user-entity";


@Injectable()
export class SuperAdminGuard implements CanActivate {

    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isSuperAdmin = this.reflector.getAllAndOverride(IS_SUPER_ADMIN, [context.getHandler(), context.getClass()])

        if (!isSuperAdmin) {
            return true
        }

        const request = context.switchToHttp().getRequest<Request>()

        const user = request.user as User;
        console.log(user);


        if (!user || user.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("access denied only aphorized user can access this route")
        }

        return true

    }
}