import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { User } from "../../user/entity/user-entity";
import { UserRole } from "@app/shared";
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

        // if (!user) {
        //     throw new UnauthorizedException('Authentication required'); // clear, correct 401 — not a mysterious 500
        // }

        return required.includes(user.role);

    }
}