import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ProfileType, User, UserRole } from './user-entity';
import { registerBody } from '../types';
import { UpdateUserDTO } from './dto/UpdateUserDTO';
import * as argon2 from "argon2"
import { STATUS } from './userfollowers-entity';
import { SafeCacheService } from '../common/cache/safe-cache.service';
import { OtpService } from '../common/otp/opt.service';
import { UserRepository } from './user.repository';
import { FollowerRepository } from './follower.repository';
import { MailProducer } from '../mail/mail-producer';



const ARGON2_OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};


@Injectable()
export class UserService {

    constructor(
        private readonly userRepository: UserRepository,
        private readonly followerRepository: FollowerRepository,
        private readonly otpService: OtpService,
        private readonly MailProducer: MailProducer,
        private readonly cache: SafeCacheService,
        private readonly mailProducer: MailProducer
    ) { }

    async findByEMailWithPassword(email: string) {
        return this.userRepository.findByEmailWithPassword(email)
    }

    async findByIdWithPassword(userId: string) {
        return this.userRepository.findByIdWithPassword(userId)
    }

    async findByEmail(email: string) {
        return this.userRepository.findByEmail(email)
    }

    async findById(userId: string) {
        return this.userRepository.findById(userId)
    }

    async create(body: registerBody) {
        const existing = await this.userRepository.findOne({ where: { email: body.email } });

        if (existing && existing.isEmailVerified) {
            throw new ConflictException('An account with this email already exists.');
        }


        if (existing && !existing.isEmailVerified) {
            await this.resendOtp(body.email);
            return { message: 'Registered. Please verify your email.', email: body.email };
        }

        const user = await this.userRepository.create(body);

        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(user.email, otp);
        await this.mailProducer.addVerificationMailJob(user.email, user.firstName!, otp);

        return { message: 'Registered. Please verify your email.', email: user.email };
    }

    async registerFailedLogin(user: User) {

        const attempts = user.failedLoginAttempts + 1
        const MAX_ATTEMPTS = 5
        const LOCK_MIN = 15

        const update: Partial<User> = { failedLoginAttempts: attempts }

        if (attempts >= MAX_ATTEMPTS) {
            update.lockedUntil = new Date(Date.now() + LOCK_MIN * 60 * 1000)
        }

        await this.userRepository.update(user.id, user)

    }

    async resetFailedLogin(userId: string) {
        await this.userRepository.update(userId, { failedLoginAttempts: 0, lockedUntil: null })
    }

    async incrementTokenVersion(userId: string) {
        await this.userRepository.incrementTokenVersion(userId)
    }

    async updateUser(id: string, user: UpdateUserDTO) {
        const update: Partial<User> = {}

        const updateResult = await this.userRepository.update(id, user)

        const cacheKey = `user:${id}`
        await this.cache.del(cacheKey)


        if (!updateResult) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
    }

    async deleteUser(targetUserId: string, performingUser: User) {
        const targetUser = await this.userRepository.findOneBy({ id: targetUserId });

        if (!targetUser) throw new NotFoundException('User not found');

        if (targetUser.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('The Main Admin account cannot be deleted.');
        }

        if (targetUser.role === UserRole.ADMIN && performingUser.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only the Super Admin can remove administrative accounts.');
        }

        const isDeleted = await this.userRepository.softDeleteUser(targetUserId);

        const cacheKey = `user:${targetUserId}`
        await this.cache.del(cacheKey)

        return isDeleted
    }

    async resetPassword(id: string, newPassword: string): Promise<boolean> {
        const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

        await this.userRepository.updateBy(
            { id } as FindOptionsWhere<User>,
            { passwordHash },
        );

        return true;
    }

    async getUser(id: string) {

        const cacheKey = `user:${id}`

        const cached = await this.cache.get(cacheKey)

        if (cached) {

            return cached
        }

        const user = await this.userRepository.findOne({ where: { id: id } })

        await this.cache.set(cacheKey, user, 300 * 1000)

        return user
    }

    async addFollowRequest(user: User, followingId: string) {

        if (user.id === followingId) {
            throw new BadRequestException("can't follow yourself");
        }

        if (user.id === followingId) {
            throw new BadRequestException("can't follow yourself");
        }

        const block = await this.followerRepository.findBlockBetween(user.id, followingId);

        if (block) {
            throw new ForbiddenException("Can't follow this user");
        }

        const existing = await this.followerRepository.findRelationship(user.id, followingId);

        if (existing) {
            if (existing.status === STATUS.BLOCK) {
                throw new ForbiddenException("Can't follow this user");
            }
            throw new ConflictException("Follow request already exists or you're already following this user");
        }

        const followingUser = await this.findById(followingId);
        if (!followingUser) {
            throw new NotFoundException("user does not exist you looking to follow");
        }

        const pendingTypes = [ProfileType.PRIVATE, ProfileType.FRIENDS_ONLY];
        const status = pendingTypes.includes(followingUser.profileVisibility)
            ? STATUS.PENDING
            : STATUS.ACCEPTED;

        return this.followerRepository.createFollowRelationship({
            followerId: user.id,
            followingId,
            status,
        });
    }

    async acceptFollowRequest(currentUser: User, requesterId: string) {

        const followRow = await this.followerRepository.findRelationship(requesterId, currentUser.id)

        if (!followRow) {
            throw new NotFoundException("Follow request not found")
        }

        if (followRow.status !== STATUS.PENDING) {
            throw new ConflictException("This request is not pending")
        }

        followRow.status = STATUS.ACCEPTED
        return await this.followerRepository.save(followRow)
    }

    async rejectFollowRequest(currentUser: User, requesterId: string) {

        const followRow = await this.followerRepository.findRelationship(requesterId, currentUser.id);

        if (!followRow) {
            throw new NotFoundException("Follow request not found")
        }

        if (followRow.status !== STATUS.PENDING) {
            throw new ConflictException("This request is not pending")
        }

        return await this.followerRepository.remove(followRow)
        // Alternative: keep the row and set status: STATUS.REJECTED
        // if you want to remember rejections instead of deleting them.
    }

    async unfollow(currentUser: User, followingId: string) {

        const followRow = await this.followerRepository.findRelationship(currentUser.id, followingId);

        if (!followRow) {
            throw new NotFoundException("You are not following this user")
        }

        const unfollowUser = await this.followerRepository.remove(followRow)

        const cacheKey = `following:${currentUser.id}`

        await this.cache.del(cacheKey)

        return unfollowUser
    }

    async removeFollower(currentUser: User, followerId: string) {

        const followRow = await this.followerRepository.findRelationship(followerId, currentUser.id);

        if (!followRow) {
            throw new NotFoundException("This user does not follow you")
        }

        const removedUser = await this.followerRepository.remove(followRow)
        await this.cache.del(`follower:${currentUser.id}`)

        return removedUser

    }

    async blockUser(currentUser: User, targetId: string) {

        if (currentUser.id === targetId) {
            throw new ConflictException("You can't block yourself")
        }

        await this.followerRepository.removeBothDirections(currentUser.id, targetId)

        return this.followerRepository.createFollowRelationship({
            followerId: currentUser.id,
            followingId: targetId,
            status: STATUS.BLOCK
        })
    }

    async unblockUser(currentUser: User, targetId: string) {

        const row = await this.followerRepository.findRelationshipWithStatus(
            currentUser.id, targetId, STATUS.BLOCK
        );

        if (!row) {
            throw new NotFoundException("This user is not blocked")
        }

        return this.followerRepository.removeRelationship(row)
    }

    async getFollowers(userId: string) {

        const cacheKey = `follower:${userId}`

        const cached = await this.cache.get(cacheKey)

        if (cached) return cached

        const followers = await this.followerRepository.getFollowers(userId)

        await this.cache.set(cacheKey, followers, 30 * 1000)

        return followers
    }

    async getFollowing(userId: string) {
        const cacheKey = `following:${userId}`
        const cached = await this.cache.get(cacheKey)
        if (cached) return cached

        const following = await this.followerRepository.getFollowing(userId)
        await this.cache.set(cacheKey, following, 30 * 1000)
        return following
    }

    async getPendingRequests(userId: string) {
        const cacheKey = `followRequest:${userId}`
        const cached = await this.cache.get(cacheKey)
        if (cached) return cached

        const followRequest = await this.followerRepository.getPendingRequests(userId)
        await this.cache.set(cacheKey, followRequest, 30 * 1000)
        return followRequest
    }

    private async getFollowStatus(requesterId: string, targetId: string): Promise<STATUS | null> {
        const row = await this.followerRepository.findRelationship(requesterId, targetId)
        return row ? row.status : null
    }

    async getUserProfile(requester: User, targetId: string) {


        const targetUser = await this.findById(targetId)

        if (!targetUser) {
            throw new NotFoundException("User not found")
        }

        // 1. Requester viewing their own profile → always full access
        if (requester.id === targetUser.id) {
            return targetUser
        }

        // 2. Admins/super-admins → always full access
        if (requester.role === UserRole.ADMIN || requester.role === UserRole.SUPER_ADMIN) {
            return targetUser
        }

        // 3. Check block status either direction — blocked = no access at all
        const blockedByTarget = await this.getFollowStatus(targetUser.id, requester.id)
        const blockedTarget = await this.getFollowStatus(requester.id, targetUser.id)

        if (blockedByTarget === STATUS.BLOCK || blockedTarget === STATUS.BLOCK) {
            throw new ForbiddenException("You cannot view this profile")
        }

        // 4. Public profiles → anyone (non-blocked) can view
        if (targetUser.profileVisibility === ProfileType.PUBLIC) {
            return this.stripPrivateFields(targetUser)
        }

        // 5. Private / Friends-only → must have an ACCEPTED follow relationship
        const relationship = await this.getFollowStatus(requester.id, targetUser.id)

        if (relationship === STATUS.ACCEPTED) {
            return this.stripPrivateFields(targetUser)
        }

        // 6. Not connected → return a locked/minimal view
        return {
            id: targetUser.id,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            isPrivate: true,
            message: "This profile is private"
        }
    }

    async resendOtp(email: string): Promise<{ message: string }> {
        const genericResponse = { message: 'If an account exists, a new verification code has been sent.' };

        const user = await this.userRepository.findOne({ where: { email } });

        if (!user || user.isEmailVerified) {
            return genericResponse;
        }

        const cooldownKey = `otp-resend-cooldown:${email}`;
        const dailyKey = `otp-resend-daily:${email}:${new Date().toISOString().slice(0, 10)}`;

        const [onCooldown, dailyCount] = await Promise.all([
            this.cache.get(cooldownKey),
            this.cache.get<number>(dailyKey),
        ]);

        if (onCooldown) {
            throw new HttpException('Please wait before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
        }
        if ((dailyCount ?? 0) >= 5) {
            throw new HttpException('Too many resend attempts today. Try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
        }

        const newOtp = this.otpService.generateOtp();
        await this.otpService.storeOtp(email, newOtp);

        await Promise.all([
            this.cache.set(cooldownKey, true, 60000),
            this.cache.set(dailyKey, (dailyCount ?? 0) + 1, this.secondsUntilMidnight() * 1000),
        ]);

        await this.mailProducer.addVerificationMailJob(email, user.firstName!, newOtp);

        return genericResponse;
    }

    private secondsUntilMidnight(): number {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight.getTime() - now.getTime()) / 1000);
    }

    private stripPrivateFields(user: User) {
        const { passwordHash, failedLoginAttempts, lockedUntil, tokenVersion, ...safeUser } = user as any
        return safeUser
    }
}