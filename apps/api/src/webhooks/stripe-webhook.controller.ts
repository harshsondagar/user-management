import { Controller, Headers, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { StripeWebhookService } from "./stripe-webhook.service";
import { Public } from "../common/decorator/public-decoretor";
import type { Request, Response } from "express";


@Controller('webhooks')
export class StripeWebhookController {
    constructor(private readonly webhookService: StripeWebhookService) { }

    @Public()
    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {
        try {
            await this.webhookService.processWebhook(req.body, signature);
            res.status(HttpStatus.OK).json({ received: true }); // MUST respond fast — Stripe times out otherwise
        } catch (err: any) {
            // signature verification failure, or any other rejection — tell Stripe clearly
            res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
        }
    }
}