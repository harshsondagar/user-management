import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PayoutService } from '../service/organization-payout.service';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import type { Request } from 'express';
import { SuperAdminGuard } from '../../common/gaurds/superAdmin-gaurds';
import { OrgOwnerGuard } from '../guard/org-owner.guard';
import { OrgEntitlementGuard } from '../guard/org-entitlement.guard';
import { RequireOrgFeature } from '../decorators/require-org-plan.decorator';


class RequestPayoutDto {
    amountCents!: number;
}

class MarkPaidDto {
    externalReference!: string;
}

class RejectPayoutDto {
    reason!: string;
}

@Controller('organizations/:organizationId/payouts')
@UseGuards(JwtGuard)
export class PayoutController {
    constructor(private readonly payoutService: PayoutService) { }


    @UseGuards(OrgOwnerGuard, OrgEntitlementGuard)
    @RequireOrgFeature('publish')
    @Post()
    async requestPayout(@Req() req: Request, @Param('organizationId') organizationId: string, @Body() dto: RequestPayoutDto) {
        return this.payoutService.requestPayout(organizationId, req.user?.id!, dto.amountCents);
    }

    @UseGuards(OrgOwnerGuard)
    @Get()
    async list(@Param('organizationId') organizationId: string) {
        return this.payoutService.listForOrg(organizationId);
    }
}

@Controller('admin/payouts')
@UseGuards(JwtGuard, SuperAdminGuard)
export class AdminPayoutController {
    constructor(private readonly payoutService: PayoutService) { }

    @Post(':payoutId/approve')
    async approve(@Req() req: any, @Param('payoutId') payoutId: string) {
        return this.payoutService.approvePayout(payoutId, req.user.id);
    }

    @Post(':payoutId/pay')
    async markPaid(@Param('payoutId') payoutId: string, @Body() dto: MarkPaidDto) {
        return this.payoutService.markPaid(payoutId, dto.externalReference);
    }

    @Post(':payoutId/reject')
    async reject(@Param('payoutId') payoutId: string, @Body() dto: RejectPayoutDto) {
        return this.payoutService.reject(payoutId, dto.reason);
    }
}