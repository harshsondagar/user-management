import { InjectRepository } from "@nestjs/typeorm";
import { BaseRepository } from "../../common/repository/base.repository";
import { RoomInvite } from "@app/shared";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RoomInviteRepositories extends BaseRepository<RoomInvite> {
    constructor(@InjectRepository(RoomInvite) repository: Repository<RoomInvite>) {
        super(repository)
    }
}