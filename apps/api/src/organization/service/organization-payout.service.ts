import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerService } from './ledger.service';
import { Payout, PayoutStatus } from "../entities/payout-entity"

const MIN_PAYOUT_CENTS = 2000;
const PAYOUT_HOLD_DAYS = 7;

@Injectable()
export class PayoutService {
    private readonly logger = new Logger(PayoutService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly ledgerService: LedgerService,
    ) { }


    async requestPayout(organizationId: string, requestedByUserId: string, amountCents: number): Promise<Payout> {

        if (amountCents < MIN_PAYOUT_CENTS) {
            throw new BadRequestException(`Minimum payout is ${MIN_PAYOUT_CENTS} cents`);
        }

        return this.dataSource.transaction(async (manager) => {
            const earningsAccountId = await this.ledgerService.getOrgEarningsAccountId(organizationId, manager);

            const currentBalance = await this.ledgerService.getBalance(earningsAccountId, manager);
            const holdCutoff = new Date(Date.now() - PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000);
            const balanceAtCutoff = await this.ledgerService.getBalanceAtTime(earningsAccountId, holdCutoff, manager);

            const withdrawable = Math.min(currentBalance, balanceAtCutoff);

            if (amountCents > withdrawable) {
                throw new BadRequestException(
                    `Requested ${amountCents} exceeds withdrawable balance ${withdrawable} ` +
                    `(current balance ${currentBalance}, funds within the last ${PAYOUT_HOLD_DAYS} days are held back)`,
                );
            }

            const reserveTransferId = await this.ledgerService.reserveForPayout(manager, organizationId, amountCents);

            const payoutRepo = manager.getRepository(Payout);
            const payout = await payoutRepo.save(
                payoutRepo.create({
                    organizationId,
                    requestedByUserId,
                    amountCents,
                    currency: 'USD',
                    status: PayoutStatus.REQUESTED,
                    ledgerTransferIds: [reserveTransferId],
                }),
            );

            this.logger.log(`Payout ${payout.id} requested: org=${organizationId} amount=${amountCents}`);
            return payout;
        });
    }


    async approvePayout(payoutId: string, approvedByUserId: string): Promise<Payout> {
        const payoutRepo = this.dataSource.getRepository(Payout);
        const payout = await payoutRepo.findOneBy({ id: payoutId });
        if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
        if (payout.status !== PayoutStatus.REQUESTED) {
            throw new BadRequestException(`Payout ${payoutId} is ${payout.status}, expected REQUESTED`);
        }

        await payoutRepo.update(payoutId, {
            status: PayoutStatus.APPROVED,
            approvedByUserId,
            approvedAt: new Date(),
        });
        return payoutRepo.findOneByOrFail({ id: payoutId });
    }

    /**
     * Admin confirms the actual bank transfer/wire has been sent (external to this system).
     * THIS is when the ledger money actually leaves for good: payouts_pending -> payouts_paid.
     */
    async markPaid(payoutId: string, externalReference: string): Promise<Payout> {
        return this.dataSource.transaction(async (manager) => {
            const payoutRepo = manager.getRepository(Payout);
            const payout = await payoutRepo.findOneBy({ id: payoutId });
            if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
            if (payout.status !== PayoutStatus.APPROVED) {
                throw new BadRequestException(`Payout ${payoutId} is ${payout.status}, expected APPROVED`);
            }

            const finalizeTransferId = await this.ledgerService.finalizePayout(manager, payout.organizationId, payout.amountCents);

            await payoutRepo.update(payoutId, {
                status: PayoutStatus.PAID,
                paidAt: new Date(),
                externalReference,
                ledgerTransferIds: [...(payout.ledgerTransferIds ?? []), finalizeTransferId],
            });
            return payoutRepo.findOneByOrFail({ id: payoutId });
        });
    }

    /**
     * Admin rejects (before payment) — returns the reserved money to the org's earnings.
     * Only valid before PAID; once paid, money has actually left, a rejection makes no sense.
     */
    async reject(payoutId: string, rejectionReason: string): Promise<Payout> {
        return this.dataSource.transaction(async (manager) => {
            const payoutRepo = manager.getRepository(Payout);
            const payout = await payoutRepo.findOneBy({ id: payoutId });
            if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
            if (payout.status === PayoutStatus.PAID) {
                throw new BadRequestException(`Payout ${payoutId} is already PAID, cannot reject`);
            }
            if (payout.status === PayoutStatus.REJECTED) {
                return payout;
            }

            const releaseTransferId = await this.ledgerService.releasePayoutReservation(
                manager,
                payout.organizationId,
                payout.amountCents,
            );

            await payoutRepo.update(payoutId, {
                status: PayoutStatus.REJECTED,
                rejectionReason,
                ledgerTransferIds: [...(payout.ledgerTransferIds ?? []), releaseTransferId],
            });
            return payoutRepo.findOneByOrFail({ id: payoutId });
        });
    }

    async listForOrg(organizationId: string): Promise<Payout[]> {
        return this.dataSource.getRepository(Payout).find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
        });
    }
}