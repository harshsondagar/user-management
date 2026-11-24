import { Body, Controller, Post, Res } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import type { Response } from 'express';


@Controller('receipts')
export class ReceiptController {
    constructor(private readonly receipts: ReceiptService) { }

    @Post()
    async generate(@Body() dto: GenerateReceiptDto, @Res() res: Response) {
        const pdf = await this.receipts.generate(dto);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="receipt-${dto.paymentId}.pdf"`,
        });
        res.send(pdf);
    }
}