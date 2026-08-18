import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { StripeWebhookEvent } from "../entities/stripe-webhook-event-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


@Injectable()
export class StripeWebhookRepository extends BaseRepository<StripeWebhookEvent> {
    constructor(@InjectRepository(StripeWebhookEvent) repository: Repository<StripeWebhookEvent>) {
        super(repository)
    }
}