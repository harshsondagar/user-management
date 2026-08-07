import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../common/repository/base.repository";
import { Followers, STATUS } from "./userfollowers-entity";
import { DeepPartial } from "typeorm";

@Injectable()
export class FollowerRepository extends BaseRepository<Followers> {

    async findBlockBetween(userId: string, otherId: string): Promise<Followers | null> {
        return this.findOne({
            where: [
                { followerId: userId, followingId: otherId, status: STATUS.BLOCK },
                { followerId: otherId, followingId: userId, status: STATUS.BLOCK },
            ],
        });
    }

    async findRelationship(followerId: string, followingId: string): Promise<Followers | null> {
        return this.findOne({ where: { followerId, followingId } });
    }

    async findRelationshipWithStatus(
        followerId: string,
        followingId: string,
        status: STATUS,
    ): Promise<Followers | null> {
        return this.findOne({ where: { followerId, followingId, status } });
    }

    async createFollowRelationship(data: DeepPartial<Followers>): Promise<Followers> {
        return this.create(data);
    }

    async updateRelationship(entity: Followers): Promise<Followers> {
        return this.save(entity);
    }

    async removeRelationship(entity: Followers): Promise<Followers> {
        return this.remove(entity);
    }

    async removeBothDirections(userId: string, otherId: string): Promise<void> {
        await this.deleteBy([
            { followerId: userId, followingId: otherId },
            { followerId: otherId, followingId: userId },
        ]);
    }

    async getFollowers(userId: string): Promise<Followers[]> {
        return this.findAll({ where: { followingId: userId, status: STATUS.ACCEPTED } });
    }

    async getFollowing(userId: string): Promise<Followers[]> {
        return this.findAll({ where: { followerId: userId, status: STATUS.ACCEPTED } });
    }

    async getPendingRequests(userId: string): Promise<Followers[]> {
        return this.findAll({ where: { followingId: userId, status: STATUS.PENDING } });
    }
}