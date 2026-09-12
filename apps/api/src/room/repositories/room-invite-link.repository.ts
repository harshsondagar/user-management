import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RoomInviteLink } from "@app/shared";
import { BaseRepository } from "../../common/repository/base.repository";

@Injectable()
export class RoomInviteLinkRepositories extends BaseRepository<RoomInviteLink> {
    constructor(@InjectRepository(RoomInviteLink) repository: Repository<RoomInviteLink>) {
        super(repository)
    }
}