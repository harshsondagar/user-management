import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ORG_FEATURE_KEY = 'require_org_feature';
export const REQUIRE_ORG_MIN_RANK_KEY = 'require_org_min_rank';

/** Route requires the org's active plan to include this Feature (via PlanEntitlement). */
export const RequireOrgFeature = (featureKey: string) => SetMetadata(REQUIRE_ORG_FEATURE_KEY, featureKey);

/** Route requires the org's active plan to be at least this rank (e.g. Plan.rank >= 2 for "Pro or above"). */
export const RequireOrgMinRank = (minRank: number) => SetMetadata(REQUIRE_ORG_MIN_RANK_KEY, minRank);