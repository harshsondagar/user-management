import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from '../utils/app-factory.util';
import { truncateAllTables } from '../utils/db.util';
import { registerAndVerifyUser } from '../utils/auth-helper.util';
import {

    validRegisterDto,
    validLoginDto,
    wrongPasswordLoginDto,
    nonExistentEmailLoginDto,
    shortPasswordLoginDto,
} from '../../fixtures/users.fixture';

describe('Auth - Login (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createTestApp();
        dataSource = app.get(DataSource);
        await truncateAllTables(dataSource);
    });

    afterEach(async () => {
        await truncateAllTables(dataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });
    it('logs in successfully with correct, verified credentials', async () => {
        await registerAndVerifyUser(app, validRegisterDto);

        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send(validLoginDto)
            .expect(200);


        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            id: expect.any(String),
            firstName: validRegisterDto.firstName ?? null,
        });
        expect(res.body.data.accessToken).toEqual(expect.any(String));
        expect(res.body.data).not.toHaveProperty('password'); // never leak the hash
    });

    it('sets a refresh token cookie on successful login', async () => {
        await registerAndVerifyUser(app, validRegisterDto);

        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send(validLoginDto)
            .expect(200);

        const cookies = res.get('Set-Cookie') ?? [];
        expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true); // adjust cookie name if different
    });

    it('rejects login with wrong password', async () => {
        await registerAndVerifyUser(app, validRegisterDto);

        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send(wrongPasswordLoginDto)
            .expect(401);

        expect(res.body.path).toBe('/auth/login');
        expect(res.body.requestId).toEqual(expect.any(String));
    });

    it('rejects login for a non-existent email', async () => {
        await request(app.getHttpServer())
            .post('/auth/login')
            .send(nonExistentEmailLoginDto)
            .expect(401);
    });

    it('rejects login for an unverified email', async () => {
        // Register but skip verification step
        await request(app.getHttpServer()).post('/auth/register').send(validRegisterDto).expect(201);

        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send(validLoginDto)
            .expect(403);

        expect(res.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects login with a password under 8 characters (DTO validation)', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send(shortPasswordLoginDto)
            .expect(400);

        expect(res.body.errorCode).toBe('BAD_REQUEST');
    });

    it('never returns a 200 with a missing accessToken', async () => {
        await registerAndVerifyUser(app, validRegisterDto);

        const res = await request(app.getHttpServer()).post('/auth/login').send(validLoginDto);

        if (res.status === 200) {
            expect(res.body.data.accessToken).toBeTruthy();
        }
    });
});