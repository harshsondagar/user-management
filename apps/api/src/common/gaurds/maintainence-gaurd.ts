import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemService } from "../../user/system.service";
import { User, UserRole } from "@app/shared";
import { PUBLIC_KEY } from "../decorator/public-decoretor";
import { Request } from "express";
import { MaintenanceModeException } from "../exceptions/app.exception";



@Injectable()

export class maintenanceGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly systemService: SystemService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const isMaintenanceMode = await this.systemService.IsMaintenanceModeActive()

        if (!isMaintenanceMode) return true

        const isPublic = this.reflector.getAllAndOverride(PUBLIC_KEY, [context.getHandler(), context.getClass()])

        if (isPublic) {
            return true
        }

        const request = context.switchToHttp().getRequest<Request>()

        const url: string = request.url || '';
        if (url.includes('/auth/login') || url.includes('/auth/register')) {
            return true;
        }

        const user = request.user as User

        if (user && user.role === UserRole.SUPER_ADMIN) {
            return true
        }

        throw new MaintenanceModeException('30-60 minutes');
    }
}