import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { Feature } from "../entities/feature-entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class FeatureRepository extends BaseRepository<Feature> {
    constructor(@InjectRepository(Feature) repository: Repository<Feature>) {
        super(repository)
    }
}