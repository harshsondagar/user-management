import { Controller, Post, Body, Req, UseGuards, Get, Query } from '@nestjs/common';
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
        return await this.billingService.createPaymentIntentForPlan(user, planId);
    }

    @Public()
    @Post('renew')
    async renewSubscription(@Body('token') token: string) {
        return this.billingService.renewViaToken(token);
    }

    @Get('plans')
    @UseGuards(JwtGuard)
    async listPlans(@currentUser() user: User) {
        return this.billingService.listPurchasablePlans(user);
    }
}