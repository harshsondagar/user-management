import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { User, UserRole } from "../../user/user-entity";
import { Request } from "express";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<UserRole[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required) return true;

        const request = context.switchToHttp().getRequest<Request>()

        const user = request.user as User;
        console.log("==========", user.role);
        return required.includes(user.role);
    }
}