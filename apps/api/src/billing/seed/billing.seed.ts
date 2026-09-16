import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { EntitlementPeriod, PlanEntitlement } from "../entities/plan-entitlement-entity";
import { PlanRepository } from "../repositorys/plan.repository";
import { FeatureRepository } from "../repositorys/feature.repository";
import { EntitlementRepository } from "../repositorys/plan-entitlement.repository";



@Injectable()
export class BillingSeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(BillingSeedService.name)

    constructor(
        private readonly planRepo: PlanRepository,
        private readonly featureRepo: FeatureRepository,
        private readonly entitlementRepo: EntitlementRepository,
    ) { }

    async onApplicationBootstrap() {
        await this.seedFeatures();
        await this.seedPlans();
        await this.seedEntitlements();
    }

    private async seedFeatures() {
        const features = [
            {
                key: 'scrape_requests',
                name: 'Scrape Requests',
                description: 'Number of data.gov.in sync jobs a user can trigger'
            },
            {
                key: 'playback',
                name: 'Media Playback',
                description: 'Allows users to stream movie and series video assets based on active plans'
            }
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
            // { code: 'pro', name: 'Pro', stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? null, isActive: false, amount: 990, rank: 1 },
            // { code: 'enterprise', name: 'Enterprise', stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? null, isActive: false, amount: 2990, rank: 2 },
            { code: 'fan', name: 'Fan', stripePriceId: process.env.STRIPE_PRICE_ID_FAN ?? null, isActive: true, amount: 990, rank: 1 },
            { code: 'mega-fan', name: 'Mega_Fan', stripePriceId: process.env.STRIPE_PRICE_ID_MEGAFAN ?? null, isActive: true, amount: 2990, rank: 2 },
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
        const scrapeFeature = await this.featureRepo.findOne({ where: { key: 'playback' } });
        if (!scrapeFeature) return;

        const entitlements = [
            { planCode: 'free', valueLimit: 1, period: EntitlementPeriod.DAILY },
            // { planCode: 'pro', valueLimit: 10, period: EntitlementPeriod.DAILY },
            // { planCode: 'enterprise', valueLimit: 100, period: EntitlementPeriod.DAILY },
            {
                planCode: 'fan', valueLimit: 2, period: EntitlementPeriod.LIFETIME, config: {
                    "videoQuality": "1080p",
                    "audioQuality": ["Stereo"],
                    "maxConcurrentStreams": 2,
                    "maxConcurrentDownload": 2,
                    "allowedDevices": ["mobile", "smart_tv",],
                }
            },
            {
                planCode: 'mega-fan', valueLimit: 2, period: EntitlementPeriod.LIFETIME, config: {
                    "videoQuality": "4K UHD",
                    "audioQuality": "Dolby Atmos",
                    "allowedDevices": ["mobile", "computers", "smart_tv", "tablet"],
                    "maxConcurrentStreams": 5,
                    "maxConcurrentDownload": 3,
                }
            },
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
                    config: e.config
                });
                this.logger.log(`Seeded entitlement: ${e.planCode} → ${e.valueLimit}/${e.period}`);
            }
        }
    }

}