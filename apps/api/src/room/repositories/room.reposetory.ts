import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Room } from "@app/shared";
import { BaseRepository } from "../../common/repository/base.repository";

@Injectable()
export class RoomRepositories extends BaseRepository<Room> {
    constructor(@InjectRepository(Room) repository: Repository<Room>) {
        super(repository)
    }
}