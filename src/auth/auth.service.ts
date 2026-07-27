import { ForbiddenException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { registerBody } from '../types';
import { UserService } from '../user/user.service';
import { User } from '../user/user-entity';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RefreshToken } from './jwt-entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetPasswordDTO } from './dto/ResetPasswordDTO';
import * as argon2 from 'argon2'
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from '../common/otp/opt.service';
import { AppException, ResourceNotFoundException } from '../common/exceptions/app.exception';
import { MailService } from '../mail/mail.service';
import { ResendOtpDto } from './dto/resend-otp.dto';

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
        , private readonly mailService: MailService
        , @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>
        , @InjectRepository(User) private readonly userRepository: Repository<User>
        , private readonly mailer: MailService
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
            await this.mailService.sendWelcomeMail(user.email, user.firstName!);
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
        await this.mailService.sendOtpEmail(user.email, user.firstName!, otp);

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

        await this.refreshTokenRepository.save(
            this.refreshTokenRepository.create({
                tokenHash: this.hashToken(refreshToken),
                userId: user.id,
                familyId,
                absoluteExpiry,
                expireAt: expireAt,
                userAgent,
                ipAddress,
            }),
        );

        return { accessToken, refreshToken, refreshTokenExpiresAt: expireAt };

    }

    async removeAllSession(id: string) {
        const res = await this.refreshTokenRepository.update({ id }, { revoked: true })
        await this.userService.incrementTokenVersion(id)
        console.log("removed from all device....", res);
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    async refreshToken(userId: string, rawToken: string, userAgent: string, ipAddress: string) {
        const tokenHash = this.hashToken(rawToken)

        const stored = await this.refreshTokenRepository.findOne({ where: { tokenHash } })
        console.log(stored);

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
        return this.issueTokenPair(user, stored.familyId, userAgent, ipAddress, stored.absoluteExpiry)

    }

    async logout(userId: string, rawToken: string) {
        if (rawToken) {
            const TokenHash = this.hashToken(rawToken)
            await this.refreshTokenRepository.update({ userId: userId }, { revoked: true })
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
        await this.refreshTokenRepository.manager.getRepository('users').update({ id }, { passwordHash: passwordHash })
        await this.removeAllSession(id)
    }

    async updatePassword(data: { newPassword: string, token: string }) {

        const hashPassword = await argon2.hash(data.newPassword, ARGON2_OPTIONS)

        await this.userRepository.update({ resetToken: data.token }, { passwordHash: hashPassword, resetToken: '' })
    }

    async checkPassword(userId: string, password: string): Promise<boolean> {
        const user = await this.userService.findByIdWithPassword(userId)
        console.log(user);

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

        console.log("password is changed, removing session from all device....");

        const isPasswordChange = await this.userService.resetPassword(userId, body.new_password)

        if (!isPasswordChange) {
            throw new UnauthorizedException("invalid password")
        }

        await this.refreshTokenRepository.update({ userId }, { revoked: true })
        await this.userService.incrementTokenVersion(userId)

        return true
    }


    async sendPasswordChangeToken(email: string) {
        const user = await this.userService.findByEmail(email)

        if (!user) {
            throw new NotFoundException("user is not found")
        }

        const token = this.hashToken(email)

        await this.userRepository.update({ email }, { resetToken: token })

        await this.mailer.sendPasswordChangeMail(user.email, `http://localhost:3000/auth/change-password?token=${token}`)
    }

}
