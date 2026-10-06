import { Injectable } from '@nestjs/common';
import { BrowserService } from '../browser/browser.service';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { renderReceipt } from './receipt.template';

@Injectable()
export class ReceiptService {
    constructor(private readonly browser: BrowserService) { }

    generate(dto: GenerateReceiptDto): Promise<Buffer> {
        return this.browser.htmlToPdf(renderReceipt(dto));
    }
}