import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';
import { Public } from '../common/decorator/public-decoretor';

@Controller('payments')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Post('checkout')
    @UseGuards(JwtGuard)
    async createCheckout(
        @Body('planId') planId: string,
        @currentUser() user: User,
    ) {
        const session = await this.billingService.createCheckoutSession(user, planId);
        return { url: session.url };
    }

    @Public()
    @Post('renew')
    async renewSubscription(@Body('token') token: string) {
        const result = await this.billingService.renewViaToken(token);
        return result; // { clientSecret } for the frontend to confirm via Stripe.js if 3DS is required
    }
}