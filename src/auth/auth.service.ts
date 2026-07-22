import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { registerBody } from '../types';
import { UserService } from '../user/user.service';
import { User } from '../user/user-entity';
import { createHash, randomUUID } from 'crypto';
import * as argon2 from 'argon2'
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RefreshToken } from './jwt-entity';
import { InjectRepository } from '@nestjs/typeorm';


interface Tokens {
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
}


export const ARGON2_OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};



@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService
        , private readonly jwtService: JwtService
        , private readonly configService: ConfigService
        , @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>) { }

    async create(data: registerBody) {
        console.log(data);

        return this.userService.create(data)
    }

    async validateCredentials(email: string, password: string): Promise<User | null> {
        const user = await this.userService.findByEMailWithPassword(email)

        if (!user) {
            throw new NotFoundException("user not exist,register first to login")
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new ForbiddenException('Account temporarily locked due to repeated failed login attempts')
        }

        const hashToVerify = user.passwordHash

        const isValid = await argon2.verify(hashToVerify, password)

        if (!isValid) {
            this.userService.registerFailedLogin(user)
            return null
        }

        await this.userService.resetFailedLogin(user.id)

        return user
    }

    async login(user: User, userAgent?: string, ipAddress?: string) {
        const familyId = randomUUID()
        return this.issueTokenPair(user, familyId, userAgent, ipAddress)
    }


    async issueTokenPair(user: User, familyId: string, userAgent?: string, ipAddress?: string): Promise<Tokens> {
        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion
        }, {
            secret: this.configService.get<string>('jwt.accessSecret'),
            expiresIn: this.configService.get<number>('jwt.accessExpiresIn')
        })

        const jti = randomUUID()
        const refreshExpiresIn = this.configService.get<string>("jwt.refreshExpiresIn")

        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.id, jti
            }, {

            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn']
        },
        )

        const expireAt = new Date(Date.now() + this.parseDurationMs(refreshExpiresIn!))

        await this.refreshTokenRepository.save(
            this.refreshTokenRepository.create({
                tokenHash: this.hashToken(refreshToken),
                userId: user.id,
                familyId,
                expireAt: expireAt,
                userAgent,
                ipAddress,
            }),
        );

        return { accessToken, refreshToken, refreshTokenExpiresAt: expireAt };

    }


    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    async refreshToken(userId: string, rawToken: string, userAgent: string, ipAddress: string) {
        const tokenHash = this.hashToken(rawToken)

        const stored = await this.refreshTokenRepository.findOne({ where: { tokenHash } })

        if (!stored) {
            throw new UnauthorizedException("token is missing")
        }

        if (stored.revoked) {
            await this.refreshTokenRepository.update(
                { familyId: stored.familyId },
                { revoked: true }
            )
            throw new ForbiddenException("refresh token reuse detected - all sessions revoked! log in again ")
        }

        if (stored.expireAt < new Date()) {
            throw new UnauthorizedException("token is expired")
        }

        if (stored.userId !== userId) {
            throw new ForbiddenException("Refresh token does not match user")
        }

        const user = await this.userService.findById(userId)

        if (!user) {
            throw new ForbiddenException("user no longer exist")
        }

        await this.refreshTokenRepository.update({ id: stored.id }, { revoked: true })
        return this.issueTokenPair(user, stored.familyId, userAgent, ipAddress)

    }

    private parseDurationMs(duration: string): number {
        const match = /^(\d+)([smhd])$/.exec(duration);
        if (!match) return 7 * 24 * 60 * 60 * 1000;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
        return value * unitMs;
    }
}
