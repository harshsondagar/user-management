import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { OrgOwnerGuard } from '../guard/org-owner.guard';
import { LedgerService } from '../service/ledger.service';

@Controller('organizations/:organizationId/earnings')
@UseGuards(JwtGuard, OrgOwnerGuard)
export class OrgEarningsController {
    constructor(private readonly ledgerService: LedgerService) { }

    @Get()
    async getBalance(@Param('organizationId') organizationId: string) {
        const earningsAccountId = await this.ledgerService.getOrgEarningsAccountId(organizationId);
        const currentBalanceCents = await this.ledgerService.getBalance(earningsAccountId);

        const holdCutoff = new Date(Date.now() - Number(process.env.PAYOUT_HOLD_DAYS ?? 7) * 24 * 60 * 60 * 1000);
        const withdrawableCents = Math.min(
            currentBalanceCents,
            await this.ledgerService.getBalanceAtTime(earningsAccountId, holdCutoff),
        );

        return { currentBalanceCents, withdrawableCents };
    }
}