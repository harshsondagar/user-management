import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { PlanEntitlement } from "../entities/plan-entitlement-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


@Injectable()
export class EntitlementRepository extends BaseRepository<PlanEntitlement> {
    constructor(@InjectRepository(PlanEntitlement) repository: Repository<PlanEntitlement>) {
        super(repository)
    }
}