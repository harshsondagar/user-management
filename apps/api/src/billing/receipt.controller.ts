import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Req, Res } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { receiptKey, ReceiptStorageService } from "@app/shared";
import type { Response } from "express";


@Controller('billing/receipts')
export class ReceiptController {
    constructor(
        private readonly billing: BillingService,
        private readonly storage: ReceiptStorageService,
    ) { }

    @Get(':paymentId')
    async download(
        @Param('paymentId', ParseUUIDPipe) paymentId: string,
        @Req() req,
        @Res() res: Response,
    ) {
        await this.billing.assertReceiptOwnedBy(paymentId, req.user.id);

        try {
            const stream = await this.storage.getStream(receiptKey(paymentId));
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="receipt-${paymentId}.pdf"`,
            });
            stream.pipe(res);
        } catch (err: any) {
            if (err.code === 'NoSuchKey') {
                throw new NotFoundException('Receipt is still being generated, try again shortly');
            }
            throw err;
        }
    }
}