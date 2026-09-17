import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { Plan } from "../entities/plan-entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class PlanRepository extends BaseRepository<Plan> {
    constructor(@InjectRepository(Plan) repository: Repository<Plan>) {
        super(repository)
    }
}