import { InjectRepository } from "@nestjs/typeorm";
import { BaseRepository } from "../../common/repository/base.repository";
import { RoomBan } from "@app/shared";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RoomBanRepositories extends BaseRepository<RoomBan> {
    constructor(@InjectRepository(RoomBan) repository: Repository<RoomBan>) {
        super(repository)
    }
}