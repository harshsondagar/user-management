// user.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Repository,
    UpdateResult,
    DeleteResult,
    DeepPartial,
    FindOptionsWhere,
} from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { User, UserRole } from './user-entity';
import { UpdateUserDTO } from './dto/UpdateUserDTO';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(
        @InjectRepository(User)
        repository: Repository<User>,
    ) {
        super(repository);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.repository.findOne({
            where: {
                email: email.toLowerCase(),
            },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.repository.findOne({
            where: { id },
        });
    }

    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.repository
            .createQueryBuilder('user')
            .where('user.email = :email', {
                email: email.toLowerCase(),
            })
            .addSelect('user.passwordHash')
            .getOne();
    }

    async findByIdWithPassword(id: string): Promise<User | null> {
        return this.repository
            .createQueryBuilder('user')
            .where('user.id = :id', { id })
            .addSelect('user.passwordHash')
            .getOne();
    }

    async existsByEmail(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return !!user;
    }

    async createUser(data: Partial<User>): Promise<User> {
        const user = this.repository.create(data);
        return this.repository.save(user);
    }

    async updateUser(
        id: string,
        dto: UpdateUserDTO,
    ): Promise<UpdateResult> {
        return this.repository.update({ id }, dto);
    }

    async updatePassword(
        id: string,
        passwordHash: string,
    ): Promise<UpdateResult> {
        return this.repository.update(
            { id },
            { passwordHash },
        );
    }

    async resetFailedLogin(id: string): Promise<UpdateResult> {
        return this.repository.update(
            { id },
            {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        );
    }

    async registerFailedLogin(user: User): Promise<User> {
        return this.repository.save(user);
    }

    async incrementTokenVersion(id: string) {
        return this.repository.increment(
            { id },
            'tokenVersion',
            1,
        );
    }

    async softDeleteUser(id: string): Promise<DeleteResult> {
        return this.repository.softDelete(id);
    }

    async findSuperAdmin(id: string): Promise<User | null> {
        return this.repository.findOne({
            where: {
                id,
                role: UserRole.SUPER_ADMIN,
            },
        });
    }

    async findAdmin(id: string): Promise<User | null> {
        return this.repository.findOne({
            where: {
                id,
                role: UserRole.ADMIN,
            },
        });
    }

    async findByResetToken(resetToken: string): Promise<User | null> {
        return this.findOneBy({ resetToken });
    }

    async setResetToken(email: string, resetToken: string, expiry: Date): Promise<void> {
        await this.updateBy({ email } as FindOptionsWhere<User>, {
            resetToken,
            resetTokenExpiry: expiry,
        });
    }

    async clearResetTokenAndSetPassword(userId: string, passwordHash: string): Promise<void> {
        await this.updateBy({ id: userId } as FindOptionsWhere<User>, {
            passwordHash,
            resetToken: null,
            resetTokenExpiry: null,
        });
    }

    async markEmailVerified(email: string): Promise<void> {
        await this.updateBy({ email } as FindOptionsWhere<User>, { isEmailVerified: true });
    }

}