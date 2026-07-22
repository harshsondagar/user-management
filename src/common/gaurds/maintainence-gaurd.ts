import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { SystemService } from "../../user/system.service";
import { UserRole } from "../../user/user-entity";



@Injectable()

export class maintenanceGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly systemService: SystemService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isMaintenanceMode = await this.systemService.IsMaintenanceModeActive()

        if (!isMaintenanceMode) return true

        const { user } = context.switchToHttp().getRequest()

        if (user && user.role === UserRole.SUPER_ADMIN) {
            return true
        }

        throw new ServiceUnavailableException({
            statusCode: 503,
            message: 'The system is currently undergoing scheduled maintenance. Please check back later.',
            estimatedDuration: '30-60 minutes'
        })
    }
}