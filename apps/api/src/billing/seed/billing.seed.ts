import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { EntitlementPeriod, PlanEntitlement } from "../entities/plan-entitlement-entity";
import { PlanRepository } from "../repositorys/plan.repository";
import { FeatureRepository } from "../repositorys/feature.repository";
import { EntitlementRepository } from "../repositorys/plan-entitlement.repository";
import { PlanStreamingPolicyRepository } from "../repositorys/plans-streaming-policy.repository";
import {
    VideoQuality,
    AudioQuality,
    DeviceType,
} from "../entities/plan-streaming-policy-entity";



@Injectable()
export class BillingSeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(BillingSeedService.name)

    constructor(
        private readonly planRepo: PlanRepository,
        private readonly featureRepo: FeatureRepository,
        private readonly entitlementRepo: EntitlementRepository,
        private readonly streamingPolicyRepo: PlanStreamingPolicyRepository,
    ) { }

    async onApplicationBootstrap() {
        await this.seedFeatures();
        await this.seedPlans();
        await this.seedEntitlements();
        await this.seedStreamingPolicies();
    }

    private async seedFeatures() {
        const features = [
            {
                key: 'scrape_requests',
                name: 'Scrape Requests',
                description: 'Number of data.gov.in sync jobs a user can trigger'
            },
            // 'playback' intentionally dropped - see note where this was
            // discussed: once PlanStreamingPolicy exists, a plan simply
            // HAVING a policy row already means "this plan includes
            // playback." A separate boolean-ish Feature/PlanEntitlement
            // row would duplicate that fact and hit the same
            // valueLimit/period mismatch the streaming config itself
            // just got moved out of. Re-add this only if you want a
            // genuinely numeric quota later (e.g. minutes/month).
        ]

        for (const f of features) {
            const exists = await this.featureRepo.findOne({ where: { key: f.key } });
            if (!exists) {
                await this.featureRepo.save(f);
                this.logger.log(`Seeded feature: ${f.key}`);
            }
        }

    }
    private async seedPlans() {
        const plans = [
            { code: 'free', name: 'Free', stripePriceId: null, isActive: true, amount: 0, rank: 0 },
            { code: 'fan', name: 'Fan', stripePriceId: process.env.STRIPE_PRICE_ID_FAN ?? null, isActive: true, amount: 990, rank: 1 },
            { code: 'mega-fan', name: 'Mega_Fan', stripePriceId: process.env.STRIPE_PRICE_ID_MEGAFAN ?? null, isActive: true, amount: 2990, rank: 2 },
            { code: 'Enterprise', name: 'enterprise', stripePriceId: null, isActive: true, amount: 3990, rank: 3 },
        ];

        for (const p of plans) {
            const exists = await this.planRepo.findOne({ where: { code: p.code } });
            if (!exists) {
                await this.planRepo.create(p);
                this.logger.log(`Seeded plan: ${p.code}`);
            }
        }

    }
    private async seedEntitlements() {
        const scrapeFeature = await this.featureRepo.findOne({ where: { key: 'scrape_requests' } });
        if (!scrapeFeature) return;

        const entitlements = [
            { planCode: 'free', valueLimit: 1, period: EntitlementPeriod.DAILY },
        ];

        for (const e of entitlements) {
            const plan = await this.planRepo.findOne({ where: { code: e.planCode } })
            if (!plan) continue

            const exists = await this.entitlementRepo.findOne({
                where: { planId: plan.id, featureId: scrapeFeature.id },
            });

            if (!exists) {
                await this.entitlementRepo.create({
                    planId: plan.id,
                    featureId: scrapeFeature.id,
                    valueLimit: e.valueLimit,
                    period: e.period,
                });
                this.logger.log(`Seeded entitlement: ${e.planCode} → ${e.valueLimit}/${e.period}`);
            }
        }
    }

    /**
     * One row per plan - existence of the row IS the "this plan can
     * stream" signal; ContentAccessGuard doesn't need a separate
     * boolean feature flag on top of this.
     */
    private async seedStreamingPolicies() {
        const policies = [
            {
                planCode: 'free',
                maxVideoQuality: VideoQuality.SD,
                audioQualities: [AudioQuality.STEREO],
                allowedDevices: [DeviceType.MOBILE, DeviceType.COMPUTER],
                maxConcurrentStreams: 1,
                maxConcurrentDownloads: 0,
            },
            {
                planCode: 'fan',
                maxVideoQuality: VideoQuality.FULL_HD,
                audioQualities: [AudioQuality.STEREO],
                allowedDevices: [DeviceType.MOBILE, DeviceType.SMART_TV],
                maxConcurrentStreams: 2,
                maxConcurrentDownloads: 2,
            },
            {
                planCode: 'mega-fan',
                maxVideoQuality: VideoQuality.UHD_4K,
                audioQualities: [AudioQuality.DOLBY_ATMOS],
                allowedDevices: [
                    DeviceType.MOBILE,
                    DeviceType.COMPUTER,
                    DeviceType.SMART_TV,
                    DeviceType.TABLET,
                ],
                maxConcurrentStreams: 5,
                maxConcurrentDownloads: 3,
            },
        ];

        for (const policy of policies) {
            const plan = await this.planRepo.findOne({ where: { code: policy.planCode } });
            if (!plan) continue;

            const exists = await this.streamingPolicyRepo.findOne({ where: { planId: plan.id } });
            if (!exists) {
                await this.streamingPolicyRepo.create({
                    planId: plan.id,
                    maxVideoQuality: policy.maxVideoQuality,
                    audioQualities: policy.audioQualities,
                    allowedDevices: policy.allowedDevices,
                    maxConcurrentStreams: policy.maxConcurrentStreams,
                    maxConcurrentDownloads: policy.maxConcurrentDownloads,
                });
                this.logger.log(`Seeded streaming policy for plan: ${policy.planCode}`);
            }
        }
    }

}