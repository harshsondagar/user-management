import { ConflictException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user-entity';
import { registerBody } from '../types';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { RegisterResponseDTO } from '../auth/dto/register-responseDTO';
import { UUID } from 'typeorm/driver/mongodb/bson.typings.js';
import { randomUUID } from 'crypto';

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
}


