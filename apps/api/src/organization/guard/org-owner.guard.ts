import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository'; // adjust to your actual repo path/name


@Injectable()
export class OrgOwnerGuard implements CanActivate {
    constructor(private readonly organizationRepo: OrganizationRepository) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const organizationId = request.params?.organizationId;
        const userId = request.user?.id;

        if (!organizationId) {
            throw new Error('OrgOwnerGuard requires an :organizationId route param');
        }

        if (!userId) {
            throw new ForbiddenException('Not authenticated');
        }

        const org = await this.organizationRepo.findOneBy({ id: organizationId });

        if (!org) {
            throw new NotFoundException(`Organization ${organizationId} not found`);
        }

        if (org.ownerUserId !== userId) {
            throw new ForbiddenException('Only the organization owner can perform this action');
        }

        request.organization = org; // stash it, avoids a second lookup in the controller/service if needed
        return true;
    }
}