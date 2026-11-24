import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { Payment } from "../entities/payment-entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
    constructor(@InjectRepository(Payment) repository: Repository<Payment>) {
        super(repository)
    }

    findIdByIntentId(paymentIntentId: string): Promise<Payment | null> {
        return this.repository.findOne({
            where: { stripePaymentIntentId: paymentIntentId },
            select: { id: true },
        });
    }

    findForReceipt(paymentId: string): Promise<Payment | null> {
        return this.repository.findOne({
            where: { id: paymentId },
            relations: {
                userSubscription: { plan: true },
                organizationSubscription: { plan: true, organization: true },
            },
        });
    }
}