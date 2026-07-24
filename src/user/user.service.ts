import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProfileType, User, UserRole } from './user-entity';
import { registerBody } from '../types';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { RegisterResponseDTO } from '../auth/dto/register-responseDTO';
import { UpdateUserDTO } from './dto/UpdateUserDTO';
import * as argon2 from "argon2"
import { Followers, STATUS } from './userfollowers-entity';



const ARGON2_OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};


@Injectable()
export class UserService {

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Followers) private readonly followerRepository: Repository<Followers>
    ) { }

    async findByEMailWithPassword(email: string) {
        return this.userRepository
            .createQueryBuilder("user")
            .where("user.email = :email", { email: email.toLowerCase() })
            .addSelect('user.passwordHash')
            .getOne()
    }

    async findByIdWithPassword(userId: string) {
        return this.userRepository
            .createQueryBuilder("user")
            .where("user.id = :id", { id: userId })
            .addSelect('user.passwordHash')
            .getOne()
    }

    async findByEmail(email: string) {
        return this.userRepository.findOne({
            where: { email: email.toLowerCase() }
        })
    }

    async findById(userId: string) {
        return this.userRepository.findOne({
            where: { id: userId }
        })
    }

    async create(body: registerBody) {

        const existing = await this.userRepository.findOne({ where: { email: body.email.toLowerCase() } })

        if (existing) {
            throw new ConflictException("A user with this email already exist")
        }

        const data = await this.userRepository.save(
            this.userRepository.create({
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                passwordHash: body.passwordHash
            })
        )

        return plainToInstance(RegisterResponseDTO, data, { excludeExtraneousValues: true })

    }

    async registerFailedLogin(user: User) {

        const attempts = user.failedLoginAttempts + 1
        const MAX_ATTEMPTS = 5
        const LOCK_MIN = 15

        const update: Partial<User> = { failedLoginAttempts: attempts }

        if (attempts >= MAX_ATTEMPTS) {
            update.lockedUntil = new Date(Date.now() + LOCK_MIN * 60 * 1000)
        }

        await this.userRepository.save(user)

    }

    async resetFailedLogin(userId: string) {
        await this.userRepository.update({ id: userId }, { failedLoginAttempts: 0, lockedUntil: null })
    }

    async incrementTokenVersion(userId: string) {
        await this.userRepository.increment({ id: userId }, 'tokenVersion', 1)
    }

    async updateUser(id: string, user: UpdateUserDTO) {
        const update: Partial<User> = {}

        const updateResult = await this.userRepository.update({ id }, user)

        if (updateResult.affected === 0) {
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
        return this.userRepository.softDelete(targetUserId);
    }

    async resetPassword(id: string, newPassword: string) {
        const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS)
        const res = await this.userRepository.update({ id }, { passwordHash: passwordHash })

        if (!res.affected) {
            return false
        }
        return true
    }

    async getUser(user: User) {
        return this.userRepository.findOne({ where: { id: user.id } })
    }

    async addFollowRequest(user: User, followingId: string) {

        if (user.id === followingId) {
            throw new NotFoundException("can't follow yourself")
        }

        const followingUser = await this.findById(followingId)

        if (!followingUser) {
            throw new NotFoundException("user does not exist you looking to follow")
        }

        const pendingTypes = [ProfileType.PRIVATE, ProfileType.FRIENDS_ONLY];

        const status = pendingTypes.includes(followingUser.profileVisibility)
            ? STATUS.PENDING
            : STATUS.ACCEPTED;


        const row = this.followerRepository.create({
            followerId: user.id,
            followingId: followingId,
            status: status
        })

        return await this.followerRepository.save(row)

    }

    async acceptFollowRequest(currentUser: User, requesterId: string) {

        const followRow = await this.followerRepository.findOne({
            where: { followerId: requesterId, followingId: currentUser.id }
        })

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

        const followRow = await this.followerRepository.findOne({
            where: { followerId: requesterId, followingId: currentUser.id }
        })

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

        const followRow = await this.followerRepository.findOne({
            where: { followerId: currentUser.id, followingId }
        })

        if (!followRow) {
            throw new NotFoundException("You are not following this user")
        }

        return await this.followerRepository.remove(followRow)
    }

    async removeFollower(currentUser: User, followerId: string) {
        // currentUser forcibly removes someone who follows them

        const followRow = await this.followerRepository.findOne({
            where: { followerId, followingId: currentUser.id }
        })

        if (!followRow) {
            throw new NotFoundException("This user does not follow you")
        }

        return await this.followerRepository.remove(followRow)
    }

    async blockUser(currentUser: User, targetId: string) {

        if (currentUser.id === targetId) {
            throw new ConflictException("You can't block yourself")
        }

        // Remove any existing relationship in either direction first
        await this.followerRepository.delete([
            { followerId: currentUser.id, followingId: targetId },
            { followerId: targetId, followingId: currentUser.id }
        ])

        const row = this.followerRepository.create({
            followerId: currentUser.id,
            followingId: targetId,
            status: STATUS.BLOCK
        })

        return await this.followerRepository.save(row)
    }

    async unblockUser(currentUser: User, targetId: string) {

        const row = await this.followerRepository.findOne({
            where: { followerId: currentUser.id, followingId: targetId, status: STATUS.BLOCK }
        })

        if (!row) {
            throw new NotFoundException("This user is not blocked")
        }

        return await this.followerRepository.remove(row)
    }

    async getFollowers(userId: string) {
        // people who follow userId (accepted only)
        return this.followerRepository.find({
            where: { followingId: userId, status: STATUS.ACCEPTED }
        })
    }

    async getFollowing(userId: string) {
        return this.followerRepository.find({
            where: { followerId: userId, status: STATUS.ACCEPTED }
        })
    }

    async getPendingRequests(userId: string) {
        // incoming follow requests waiting for userId's approval
        return this.followerRepository.find({
            where: { followingId: userId, status: STATUS.PENDING }
        })
    }

    private async getFollowStatus(requesterId: string, targetId: string): Promise<STATUS | null> {
        const row = await this.followerRepository.findOne({
            where: { followerId: requesterId, followingId: targetId }
        })
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
        console.log(relationship);

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

    private stripPrivateFields(user: User) {
        const { passwordHash, failedLoginAttempts, lockedUntil, tokenVersion, ...safeUser } = user as any
        return safeUser
    }
}


