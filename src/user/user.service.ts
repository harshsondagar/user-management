import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './user-entity';
import { registerBody } from '../types';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { RegisterResponseDTO } from '../auth/dto/register-responseDTO';
import { UpdateUserDTO } from './dto/UpdateUserDTO';
import * as argon2 from "argon2"



const ARGON2_OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};


@Injectable()
export class UserService {

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) { }

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

}


