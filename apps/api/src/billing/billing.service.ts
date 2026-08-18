import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { Plan } from "./entities/plan-entity";
import { User } from "../user/entity/user-entity";
import { UserRepository } from "../user/user.repository";


@Injectable()

export class BillingService {
    constructor(
        @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
        private readonly userRepo: UserRepository
    ) { }


    async createCheckoutSession(user: User, chosenPlan: Plan, currency: string = 'inr'): Promise<Stripe.Checkout.Session> {

        if (!chosenPlan.stripePriceId) {
            throw new BadRequestException('Free plans do not have a Stripe Price ID and cannot open a checkout session.');
        }

        const customers = await this.stripe.customers.list({ email: user.email, limit: 1 });
        let customerId = customers.data[0]?.id;

        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.email.split('@')[0],
            });
            customerId = customer.id;
            await this.userRepo.update(user.id, { stripeCustomerId: customerId });
        }

        const successUrl = 'http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}';
        const cancelUrl = 'http://localhost:3000/billing/cancel';

        return this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: chosenPlan.stripePriceId,
                    quantity: 1
                },
            ],
            billing_address_collection: 'required',
            mode: 'subscription', // Changed from 'payment' to 'subscription'
            success_url: successUrl, // Dynamically use the passed success parameter
            cancel_url: cancelUrl,   // Dynamically use the passed cancel parameter
            metadata: {
                userId: user.id, // Helpful payload tracking for your webhooks
                planId: chosenPlan.id,
            },
        });
    }
}