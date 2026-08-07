import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '@app/shared';
import { UpdateUserDTO } from './dto/UpdateUserDTO';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { UserResponseDto } from '../auth/dto/user-response-dto';
import { STATUS } from '@app/shared';
import { FollowResponseDto } from './dto/follow-responseDTO';
import { Serialize } from '../common/interceptors/serialize-interceptor';
import { ResponseMessage } from '../common/decorator/response-message.decorator';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('user')
export class UserController {
    constructor(private readonly userServices: UserService) { }

    @UseGuards(JwtGuard)
    @Get("me")
    @Serialize(UserResponseDto)
    async getUser(@currentUser() user: User) {
        return this.userServices.getUser(user.id)
    }

    @UseGuards(JwtGuard)
    @Put("me")
    async changeUSer(@currentUser() user: User, @Body() body: UpdateUserDTO) {
        await this.userServices.updateUser(user.id, body);
    }

    @UseGuards(JwtGuard)
    @Delete("me")
    @ResponseMessage("account deleted!")
    async delete(@currentUser() user: User) {
        const isDeleted = await this.userServices.deleteUser(user.id, user)

        if (!isDeleted) {
            throw new InternalServerErrorException("error while deleting, try again")
        }
    }


    @UseGuards(JwtGuard)
    @Post(":followingId/follow")
    @Serialize(FollowResponseDto)
    async follow(@currentUser() user: User, @Param('followingId') followingId: string) {
        return this.userServices.addFollowRequest(user, followingId)
    }

    @UseGuards(JwtGuard)
    @Post(":requesterId/follow/accept")
    @Serialize(FollowResponseDto)
    @ResponseMessage("follow request accepted")
    async acceptFollow(@currentUser() user: User, @Param('requesterId') requesterId: string) {
        return this.userServices.acceptFollowRequest(user, requesterId)
    }

    @UseGuards(JwtGuard)
    @Post(":requesterId/follow/reject")
    @ResponseMessage("follow request rejected")
    async rejectFollow(@currentUser() user: User, @Param('requesterId') requesterId: string) {
        await this.userServices.rejectFollowRequest(user, requesterId)
    }

    @UseGuards(JwtGuard)
    @Delete(":followingId/unfollow")
    @ResponseMessage("unfollowed")
    async unfollow(@currentUser() user: User, @Param('followingId') followingId: string) {
        await this.userServices.unfollow(user, followingId)
    }

    @UseGuards(JwtGuard)
    @Delete(":followerId/remove-follower")
    @ResponseMessage("follower removed")
    async removeFollower(@currentUser() user: User, @Param('followerId') followerId: string) {
        await this.userServices.removeFollower(user, followerId)
    }

    // ---- Block / unblock ----

    @UseGuards(JwtGuard)
    @Post(":targetId/block")
    @Serialize(FollowResponseDto)
    @ResponseMessage("user blocked")
    async block(@currentUser() user: User, @Param('targetId') targetId: string) {
        return this.userServices.blockUser(user, targetId)
    }

    @UseGuards(JwtGuard)
    @Delete(":targetId/block")
    @ResponseMessage("user unblocked")
    async unblock(@currentUser() user: User, @Param('targetId') targetId: string) {
        await this.userServices.unblockUser(user, targetId)
    }

    // ---- Lists ----
    @UseGuards(JwtGuard)
    @Get("me/followers")
    @Serialize(FollowResponseDto)
    async myFollowers(@currentUser() user: User) {
        return this.userServices.getFollowers(user.id)
    }

    @UseGuards(JwtGuard)
    @Get("me/following")
    @Serialize(FollowResponseDto)
    async myFollowing(@currentUser() user: User) {
        return this.userServices.getFollowing(user.id)
    }

    @UseGuards(JwtGuard)
    @Get("me/follow-requests")
    @Serialize(FollowResponseDto)
    async pendingRequests(@currentUser() user: User) {
        return this.userServices.getPendingRequests(user.id)
    }

    @UseGuards(JwtGuard)
    @Get(':id')
    @Serialize(UserResponseDto)
    async getProfile(@currentUser() user: User, @Param('id') id: string) {
        return this.userServices.getUserProfile(user, id)
    }

}