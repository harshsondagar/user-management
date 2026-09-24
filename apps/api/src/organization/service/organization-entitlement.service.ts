import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';


@Injectable()
export class OrganizationEntitlementsService {
    constructor(
        private readonly dataSource: DataSource
    ) { }

    async getEntitlementLimit(organizationId: string, featureKey: string): Promise<number | null> {
        const row = await this.dataSource
            .createQueryBuilder()
            .select('entitlement.valueLimit', 'valueLimit')
            .from('organization_subscriptions', 'sub')
            .innerJoin('plan_entitlements', 'entitlement', 'entitlement."planId" = sub."planId"')
            .innerJoin('features', 'feature', 'feature.id = entitlement."featureId"')
            .where('sub."organizationId" = :organizationId', { organizationId })
            .andWhere('sub.status = :status', { status: 'active' })
            .andWhere('feature.key = :featureKey', { featureKey })
            .getRawOne();



        return row ? Number(row.valueLimit) : null;
    }

    async getActiveMemberCount(organizationId: string): Promise<number> {
        return this.dataSource
            .createQueryBuilder()
            .select('COUNT(*)', 'count')
            .from('members', 'member')
            .where('member.organization_id = :organizationId', { organizationId })
            .andWhere('member.status = :status', { status: 'active' })
            .getRawOne()
            .then((r) => Number(r.count));
    }
}