import { Controller, Headers, HttpStatus, Post, Req, Res, type RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { StripeWebhookService } from "./stripe-webhook.service";
import { Public } from "../common/decorator/public-decoretor";

@Controller('webhooks')
export class StripeWebhookController {
    constructor(private readonly webhookService: StripeWebhookService) { }

    @Public()
    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {


        if (!req.rawBody) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Raw body unavailable' });
            return;
        }

        try {
            await this.webhookService.processWebhook(req.rawBody, signature);
            res.status(HttpStatus.OK).json({ received: true });
        } catch (err: any) {
            res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
        }
    }
}