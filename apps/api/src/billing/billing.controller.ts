import { Controller, Post, Body, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PlanRepository } from './repositorys/plan.repository';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';


@Controller('payments')
export class BillingController {
    constructor(
        private readonly billingService: BillingService,
        private readonly planRepository: PlanRepository
    ) { }

    @Post('checkout')
    @UseGuards(JwtGuard)
    async createCheckout(
        @Body('planId') planId: string,
        @currentUser() user: User
    ) {
        const email = user.email
        if (!email) {
            throw new BadRequestException('User email not found in authentication context.');
        }

        const chosenPlan = await this.planRepository.findOne({ where: { id: planId } });
        if (!chosenPlan) {
            throw new BadRequestException(`Plan with ID ${planId} does not exist`);
        }

        const session = await this.billingService.createCheckoutSession(
            user,
            chosenPlan
        );

        return { url: session.url };
    }
}
