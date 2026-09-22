import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationAccessService } from '../service/organization.access.service';
import { REQUIRE_PERMISSION_KEY } from './required.permission.decoretor';


@Injectable()
export class PermissionGuard implements CanActivate {

    constructor(
        private readonly reflector: Reflector,
        private readonly organizationAccessService: OrganizationAccessService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required =
            this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? [];

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const organizationId = request.params?.organizationId;

        if (!organizationId) {
            throw new Error('PermissionGuard requires an :organizationId route param');
        }

        const access = await this.organizationAccessService.getMemberAccess(user.id, organizationId);
        request.orgMember = access.member;

        if (access.isOwner || required.length === 0) {
            return true;
        }

        const hasAll = required.every((key) => access.permissionKeys.has(key));
        if (!hasAll) {
            throw new ForbiddenException(
                `Missing required permission: ${required.filter((k) => !access.permissionKeys.has(k)).join(', ')}`,
            );
        }

        return true;
    }
}