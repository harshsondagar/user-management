import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationSubscriptionRepository } from '../repositories/organization.org-entitlement.repository';
import { OrganizationEntitlementsService } from '../service/organization-entitlement.service';
import { SubscriptionStatus } from '../../billing/entities/user-subscription-entity';
import { REQUIRE_ORG_FEATURE_KEY, REQUIRE_ORG_MIN_RANK_KEY } from "../decorators/require-org-plan.decorator"

@Injectable()
export class OrgEntitlementGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly orgSubRepo: OrganizationSubscriptionRepository,
        private readonly entitlementsService: OrganizationEntitlementsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_ORG_FEATURE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const requiredMinRank = this.reflector.getAllAndOverride<number | undefined>(REQUIRE_ORG_MIN_RANK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const request = context.switchToHttp().getRequest();
        const organizationId = request.params?.organizationId;
        if (!organizationId) {
            throw new Error('OrgEntitlementGuard requires an :organizationId route param');
        }

        const subscription = await this.orgSubRepo.findOne({
            where: { organizationId },
            relations: ['plan'],
            order: { createdAt: 'DESC' },
        });

        if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
            throw new ForbiddenException('This organization does not have an active subscription.');
        }
        if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
            throw new ForbiddenException('This organization\'s subscription has expired.');
        }

        if (requiredMinRank !== undefined && subscription.plan.rank < requiredMinRank) {
            throw new ForbiddenException(`This feature requires a higher-tier plan for this organization.`);
        }

        if (requiredFeature) {
            const limit = await this.entitlementsService.getEntitlementLimit(organizationId, requiredFeature);
            if (limit === null || limit <= 0) {
                throw new ForbiddenException(`This organization's plan does not include: ${requiredFeature}`);
            }
        }

        request.orgSubscription = subscription;
        return true;
    }
}