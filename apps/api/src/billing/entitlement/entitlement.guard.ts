import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EntitlementService } from "./entitlement.service";
import { Request } from "express";
import { UserRole } from "@app/shared";

export const ENTITLEMENT_KEY = 'entitlement_feature';
export const RequireEntitlement = (featureKey: string) => SetMetadata(ENTITLEMENT_KEY, featureKey);

@Injectable()
export class EntitlementGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly entitlementService: EntitlementService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureKey = this.reflector.getAllAndOverride<string>(ENTITLEMENT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!featureKey) return true;

        const { user } = context.switchToHttp().getRequest<Request>();

        if (!user) {
            throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
        }

        if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            return true;
        }

        const result = await this.entitlementService.checkAndConsume(user.id, featureKey);

        if (!result.allowed) {
            throw new HttpException(
                {
                    errorCode: 'QUOTA_EXCEEDED',
                    message: `You've used ${result.used}/${result.limit} for this period. Upgrade your plan for more access.`,
                    limit: result.limit,
                    resetsAt: result.periodEnd,
                },
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        (context.switchToHttp().getRequest<Request>() as any).entitlement = result

        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', result.limit);
        response.setHeader('X-RateLimit-Remaining', result.remaining);

        return true;


    }
}