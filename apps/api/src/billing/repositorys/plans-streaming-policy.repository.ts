import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlanStreamingPolicy } from "../entities/plan-streaming-policy-entity";
import { BaseRepository } from "../../common/repository/base.repository";

@Injectable()
export class PlanStreamingPolicyRepository extends BaseRepository<PlanStreamingPolicy> {
    constructor(@InjectRepository(PlanStreamingPolicy) repository: Repository<PlanStreamingPolicy>) {
        super(repository);
    }
}