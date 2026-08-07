
import { Expose } from 'class-transformer';
import { STATUS } from '@app/shared';

export class FollowResponseDto {
    @Expose()
    declare id: string;

    @Expose()
    declare followerId: string;

    @Expose()
    declare followingId: string;

    @Expose()
    declare status: STATUS;

    @Expose()
    declare createdAt: Date;

    constructor(partial: Partial<FollowResponseDto>) {
        Object.assign(this, partial);
    }
}