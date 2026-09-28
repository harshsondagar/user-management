import { Controller, Post, Body, Param, UseGuards, Get } from '@nestjs/common';
import { BillingService } from '../../billing/billing.service';
import { RequirePermission } from '../guard/required.permission.decoretor';
import { PermissionGuard } from '../guard/permission.gaurd';
import { PERMISSIONS } from '../service/constant';
import { JwtGuard } from '../../auth/gurads/jwt.guard';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('organizations/:organizationId/checkout')
export class OrganizationBillingController {
    constructor(private readonly billingService: BillingService) { }

    @Get('plans')
    listPlans(@Param('organizationId') organizationId: string) {
        return this.billingService.listPurchasableOrgPlans(organizationId);
    }

    @Post()
    @RequirePermission(PERMISSIONS.ORG_MANAGE_BILLING)
    create(@Param('organizationId') organizationId: string, @Body('planId') planId: string) {
        return this.billingService.createPaymentIntentForOrgPlan(organizationId, planId);
    }
}