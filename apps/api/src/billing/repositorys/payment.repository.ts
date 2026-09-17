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
}