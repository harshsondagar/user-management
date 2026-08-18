import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { UsageCounter } from "../entities/usage-counter-entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class UsageRepository extends BaseRepository<UsageCounter> {
    constructor(@InjectRepository(UsageCounter) repository: Repository<UsageCounter>) {
        super(repository)
    }
}   