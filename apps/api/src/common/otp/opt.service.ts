import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import crypto from "crypto"
import type { Cache } from "cache-manager";

@Injectable()
export class OtpService {
    private readonly OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
    private readonly MAX_ATTEMPTS = 5;

    constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) { }

    private hashOtp(otp: string) {
        return crypto.createHash('sha256').update(otp).digest('hex')
    }

    generateOtp() {
        return crypto.randomInt(100000, 999999).toString()
    }

    async storeOtp(email: string, otp: string) {
        const hashed = this.hashOtp(otp)

        await this.cache.set(`otp:${email}`, hashed, this.OTP_TTL_MS)
        await this.cache.set(`otp-attempts:${email}`, 0, this.OTP_TTL_MS)
    }

    async verifyOtp(email: string, otp: string): Promise<{ valid: boolean, reason?: string }> {
        const stored = await this.cache.get<string>(`otp:${email}`);

        if (!stored) {
            return { valid: false, reason: 'OTP_EXPIRED_OR_NOT_FOUND' };
        }

        const attempts = (await this.cache.get<number>(`otp-attempts:${email}`)) ?? 0;

        if (attempts >= this.MAX_ATTEMPTS) {
            await this.cache.del(`otp:${email}`);
            return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
        }


        const hashedInput = this.hashOtp(otp);

        if (hashedInput !== stored) {
            await this.cache.set(`otp-attempts:${email}`, attempts + 1, this.OTP_TTL_MS);
            return { valid: false, reason: 'INVALID_OTP' };
        }

        await this.cache.del(`otp:${email}`);
        await this.cache.del(`otp-attempts:${email}`);
        return { valid: true };
    }



}