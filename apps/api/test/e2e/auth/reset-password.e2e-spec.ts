import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from '../utils/app-factory.util';
import { truncateAllTables } from '../utils/db.util';
import { makeRegisterDto, validResetPasswordDto, weakNewPasswordDto, weakPasswordDto, wrongCurrentPasswordDto } from '../../fixtures/users.fixture';
import { createAuthenticatedUser, getPasswordResetToken, registerAndVerifyUser } from '../utils/auth-helper.util';
import request from "supertest"
import { RegisterDTO } from '../../../src/auth/dto/register-dto';
import { register } from 'module';
import { mockMailService } from '../utils/mock-mail.util';
describe('AUTH - Reset password (e2e)', () => {
    let app: INestApplication
    let dataSource: DataSource

    beforeAll(async () => {
        app = await createTestApp()
        dataSource = app.get(DataSource)
        await truncateAllTables(dataSource)
    })

    afterEach(async () => {
        await truncateAllTables(dataSource)
    })

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close()
    })

    it('should change the password with correct current password', async () => {

        const registerDto = makeRegisterDto()
        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        const res = await request(app.getHttpServer())
            .patch('/auth/reset-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ ...validResetPasswordDto, password: registerDto.password })
            .expect(200)

        expect(res.body.data).toMatchObject({
            success: true,
            message: 'password changed successfully',
        })
    })


    it('rejects when current password is wrong', async () => {
        const registerDto = makeRegisterDto()
        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        await request(app.getHttpServer())
            .patch('/auth/reset-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(wrongCurrentPasswordDto)
            .expect(401);
    })

    it('reject a weak password (DTO validation)', async () => {
        const registerDto = makeRegisterDto()
        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        const res = await request(app.getHttpServer())
            .patch('/auth/reset-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ ...weakNewPasswordDto, password: registerDto.password })
            .expect(400)


        expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    })

    it('should send a password reset token mail to user ', async () => {
        const registerDto = makeRegisterDto()
        await registerAndVerifyUser(app, registerDto)

        const res = await request(app.getHttpServer())
            .patch('/auth/forgot-password')
            .send({ email: registerDto.email })
            .expect(200)

        expect(res.body.data.message).toMatch('if that email exists, a reset link has been sent')
    })

    it('completes the full reset flow: forgot-password → click link → change password', async () => {
        const registerDto = makeRegisterDto();
        await registerAndVerifyUser(app, registerDto);

        await request(app.getHttpServer())
            .patch('/auth/forgot-password')
            .send({ email: registerDto.email })
            .expect(200);

        const { resetToken } = await getPasswordResetToken(dataSource, registerDto.email);
        expect(resetToken).toBeTruthy();


        const pageRes = await request(app.getHttpServer())
            .get(`/auth/change-password?token=${resetToken}`)
            .expect(200)

        expect(pageRes.text).toContain(resetToken)

        const call = mockMailService.sendPasswordChangeMail.mock.calls.at(-1);
        const link: string = call[1];
        const rawToken = new URL(link).searchParams.get('token');

        await request(app.getHttpServer())
            .post('/auth/change-password')
            .send({ newPassword: 'BrandNew!Passw0rd@004', token: rawToken })
            .expect(201)


        await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: registerDto.email, password: 'BrandNew!Passw0rd@004' })
            .expect(200);

        await request(app.getHttpServer())
            .post('/auth/change-password')
            .send({ newPassword: 'AnotherPass1!', token: resetToken })
            .expect(400);
    })


})