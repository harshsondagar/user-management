import { Inject, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { PlanRepository } from "../repositorys/plan.repository";


@Injectable()
export class CreatePlanService {
    constructor(
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
        private readonly planRepository: PlanRepository
    ) {
    }

    async createPlan() {

        const plans = await this.planRepository.findAll()

        for (const p of plans) {
            const featureDescriptions = p.entitlements
                ?.map(e => `${e.feature?.name || 'Feature'}: Up to ${e.valueLimit}`)
                .join(', ') || 'Standard access tier';

            this.stripe.products.create({
                name: p.name,
                description: featureDescriptions,
            })
        }
    }
}