import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/repository/base.repository";
import { UserSubscription } from "../entities/user-subscription-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


@Injectable()
export class UserSubscriptionRepository extends BaseRepository<UserSubscription> {
    constructor(@InjectRepository(UserSubscription) repository: Repository<UserSubscription>) {
        super(repository)
    }
}