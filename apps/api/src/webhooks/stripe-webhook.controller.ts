import { Controller, Headers, HttpStatus, Post, Req, Res, type RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { StripeWebhookService } from "./stripe-webhook.service";
import { Public } from "../common/decorator/public-decoretor";

@Controller('webhooks')
export class StripeWebhookController {
    constructor(private readonly webhookService: StripeWebhookService) { }


}