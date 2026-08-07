import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { registerBody } from '../types';
import { UserService } from '../user/user.service';
import { User } from '../user/user-entity';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDTO } from './dto/ResetPasswordDTO';
import * as argon2 from 'argon2'
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from '../common/otp/opt.service';
import { AppException, ResourceNotFoundException } from '../common/exceptions/app.exception';
import { ResendOtpDto } from './dto/resend-otp.dto';
import * as crypto from "crypto"
import { ChangeForgotPassword } from './dto/change-password-dto';
import { UserRepository } from '../user/user.repository';
import { RefreshTokenRepository } from './refreshTokenRepository';
import { MailProducer } from '../mail/mail-producer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

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

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name)

    constructor(
        private readonly userService: UserService
        , private readonly jwtService: JwtService
        , private readonly configService: ConfigService
        , private readonly otpService: OtpService
        , @Inject(CACHE_MANAGER) private readonly cache: Cache
        , private readonly refreshTokenRepository: RefreshTokenRepository
        , private readonly userRepository: UserRepository
        , private readonly mailProducer: MailProducer
    ) { }

    async create(data: registerBody) {
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

    async verifyOtp(dto: VerifyOtpDto) {
        const result = await this.otpService.verifyOtp(dto.email, dto.otp);

        if (!result.valid) {
            throw new AppException(
                result.reason ?? 'INVALID_OTP',
                'Invalid or expired verification code',
                HttpStatus.BAD_REQUEST,
            );
        }

        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) {
            throw new ResourceNotFoundException('User', dto.email);
        }

        user.isEmailVerified = true;
        await this.userRepository.save(user);

        try {
            await this.mailProducer.addWelcomeMailJob(user.email, user.firstName!);
        } catch (error) {
            this.logger.warn(`Welcome email failed for ${user.email}: ${(error as Error).message}`);
        }

        return { message: 'Email verified successfully', success: true };
    }

    async resendOtp(dto: ResendOtpDto) {
        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) {
            throw new ResourceNotFoundException('User', dto.email);
        }

        if (user.isEmailVerified) {
            throw new AppException('ALREADY_VERIFIED', 'Email is already verified', HttpStatus.BAD_REQUEST);
        }

        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(user.email, otp);
        await this.mailProducer.addVerificationMailJob(user.email, user.firstName!, otp);

        return { message: 'OTP resent' };
    }

    async login(user: User, userAgent?: string, ipAddress?: string) {
        const familyId = randomUUID()
        return this.issueTokenPair(user, familyId, userAgent, ipAddress)
    }

    async issueTokenPair(user: User, familyId: string, userAgent?: string, ipAddress?: string, existingAbsoluteExpiry?: Date): Promise<Tokens> {
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

        const absoluteExpiry = existingAbsoluteExpiry ?? new Date(Date.now() + SEVEN_DAYS_IN_MS);

        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.id, jti
            }, {

            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn']
        },
        )

        const expireAt = new Date(Date.now() + this.parseDurationMs(refreshExpiresIn!))

        await this.refreshTokenRepository.createRefreshToken({
            tokenHash: this.hashToken(refreshToken),
            userId: user.id,
            familyId,
            absoluteExpiry,
            expireAt: expireAt,
            userAgent,
            ipAddress,
        })

        return { accessToken, refreshToken, refreshTokenExpiresAt: expireAt };

    }

    async removeAllSession(id: string) {
        const res = await this.refreshTokenRepository.update(id, { revoked: true })
        await this.userService.incrementTokenVersion(id)
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
                stored.familyId,
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

        await this.refreshTokenRepository.update(stored.id, { revoked: true })
        return this.issueTokenPair(user, stored.familyId, userAgent, ipAddress, stored.absoluteExpiry)

    }

    async logout(userId: string, rawToken: string) {
        if (rawToken) {
            const TokenHash = this.hashToken(rawToken)
            await this.refreshTokenRepository.update(userId, { revoked: true })
            await this.userService.incrementTokenVersion(userId)
        }
    }

    private parseDurationMs(duration: string): number {
        const match = /^(\d+)([smhd])$/.exec(duration);
        if (!match) return 7 * 24 * 60 * 60 * 1000;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
        return value * unitMs;
    }

    async changePassword(id: string, password: string) {
        const passwordHash = await argon2.hash(password, ARGON2_OPTIONS)
        await this.userRepository.clearResetTokenAndSetPassword(id, passwordHash)
        await this.removeAllSession(id)
    }

    async updatePassword(data: ChangeForgotPassword) {

        const hashedToken = this.hashToken(data.token);

        const user = await this.userRepository.findOne({ where: { resetToken: hashedToken } });

        if (!user) {
            throw new AppException('INVALID_RESET_TOKEN', 'Invalid or expired reset token', HttpStatus.BAD_REQUEST);
        }

        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new AppException('RESET_TOKEN_EXPIRED', 'This reset link has expired', HttpStatus.BAD_REQUEST);
        }
        await this.removeAllSession(user.id)
        const passwordHash = await argon2.hash(data.newPassword, ARGON2_OPTIONS);

        await this.userRepository.update(
            user.id,
            {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            },
        );

        await this.removeAllSession(user.id)

    }

    async checkPassword(userId: string, password: string): Promise<boolean> {
        const user = await this.userService.findByIdWithPassword(userId)

        if (!user) {
            throw new NotFoundException("user not found")
        }


        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new ForbiddenException('Account temporarily locked due to repeated failed login attempts')
        }

        const hashToVerify = user.passwordHash ?? "ASdagusgfsbfasgfagsdfkalsgfil"

        const isValid = await argon2.verify(hashToVerify, password)

        if (!isValid) {
            throw new UnauthorizedException('invalid password, old password is incorrect')
        }

        return true

    }

    async resetPassword(userId: string, body: ResetPasswordDTO) {


        const isValidPassword = await this.checkPassword(userId, body.password)

        if (!isValidPassword) {
            throw new UnauthorizedException("invalid password")
        }

        await this.userService.resetPassword(userId, body.password)

        await this.refreshTokenRepository.update(userId, { revoked: true })

        await this.userService.incrementTokenVersion(userId)
    }

    async sendPasswordChangeToken(email: string): Promise<{ message: string }> {
        const genericResponse = { message: 'If an account exists, a password reset link has been sent.' };

        const user = await this.userService.findByEmail(email);
        if (!user) {
            return genericResponse;
        }

        const cooldownKey = `pwd-reset-cooldown:${email}`;
        const dailyKey = `pwd-reset-daily:${email}:${new Date().toISOString().slice(0, 10)}`;

        const [onCooldown, dailyCount] = await Promise.all([
            this.cache.get(cooldownKey),
            this.cache.get<number>(dailyKey),
        ]);

        if (onCooldown) {
            throw new HttpException('Please wait before requesting another reset link.', HttpStatus.TOO_MANY_REQUESTS);
        }
        if ((dailyCount ?? 0) >= 5) {
            throw new HttpException('Too many reset attempts today. Try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await this.hashToken(rawToken);

        await this.userRepository.updateBy(
            { email },
            { resetToken: hashedToken, resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000) },
        );

        await Promise.all([
            this.cache.set(cooldownKey, true, 60_000),
            this.cache.set(dailyKey, (dailyCount ?? 0) + 1, this.secondsUntilMidnight() * 1000),
        ]);

        const API_URL = this.configService.get<string>('api.url')

        await this.mailProducer.addForgotPasswordMailJob(
            user.email,
            `${API_URL}/auth/change-password?token=${rawToken}`,
        );

        return genericResponse;
    }


    private secondsUntilMidnight(): number {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight.getTime() - now.getTime()) / 1000);
    }

}
