// dto/follow-response.dto.ts
import { Expose } from 'class-transformer';
import { STATUS } from '../userfollowers-entity';

export class FollowResponseDto {
    @Expose()
    id: string;

    @Expose()
    followerId: string;

    @Expose()
    followingId: string;

    @Expose()
    status: STATUS;

    @Expose()
    createdAt: Date;

    constructor(partial: Partial<FollowResponseDto>) {
        Object.assign(this, partial);
    }
}