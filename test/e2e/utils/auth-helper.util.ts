import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OtpService } from '../../../src/common/otp/opt.service';
import { DataSource } from 'typeorm';

interface RegisterInput {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}


export async function registerAndVerifyUser(
    app: INestApplication,
    registerDto: RegisterInput,
): Promise<void> {
    await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

    const otpService = app.get(OtpService);
    const otp = otpService.generateOtp();
    await otpService.storeOtp(registerDto.email, otp);

    await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ email: registerDto.email, otp })
        .expect(200);
}

export async function loginAndGetToken(
    app: INestApplication,
    email: string,
    password: string,
): Promise<{ accessToken: string; cookies: string[] }> {
    const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

    return {
        accessToken: res.body.data.accessToken,
        cookies: res.get('Set-Cookie') ?? [],
    };
}

export async function createAuthenticatedUser(
    app: INestApplication,
    registerDto: RegisterInput,
): Promise<{ accessToken: string; cookies: string[] }> {
    await registerAndVerifyUser(app, registerDto);
    return loginAndGetToken(app, registerDto.email, registerDto.password);
}

export async function getPasswordResetToken(
    dataSource: DataSource,
    email: string,
): Promise<{ resetToken: string | null; resetTokenExpiresAt: Date | null }> {

    const result = await dataSource.query(
        'SELECT "resetToken", "resetTokenExpiry" FROM "users" WHERE email = $1',
        [email],
    );

    if (!result[0]) {
        throw new Error(`No user found with email ${email}`);
    }

    return {
        resetToken: result[0].resetToken ?? null,
        resetTokenExpiresAt: result[0].resetTokenExpiresAt ?? null,
    };
}