import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from '../utils/app-factory.util';
import { truncateAllTables } from '../utils/db.util';
import {
    makeRegisterDto,
    missingEmailDto,
    invalidEmailDto,
    weakPasswordDto,
    noUppercasePasswordDto,
    noNumberPasswordDto,
    noLowercasePasswordDto,
    noSpecialCharPasswordDto,
    tooShortPasswordDto,
} from '../../fixtures/users.fixture';

describe('Auth - Register (e2e)', () => {
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

    it('rejects password missing an uppercase letter', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(noUppercasePasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must contain an uppercase letter');
    });


    it('registers successfully and returns 201 with message + email', async () => {
        const dto = makeRegisterDto();

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(dto)
            .expect(201);

        expect(res.body.data).toEqual({
            message: 'Registered. Please verify your email.',
            email: dto.email,
        });
    });

    it('registers successfully without optional firstName/lastName', async () => {
        const dto = makeRegisterDto({ firstName: undefined, lastName: undefined });
        await request(app.getHttpServer()).post('/auth/register').send(dto).expect(201);
    });

    it('rejects registration with missing email', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(missingEmailDto)
            .expect(400);

        expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with invalid email format', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(invalidEmailDto)
            .expect(400);

        expect(res.body.message).toContain('please enter a valid email address');
    });

    it('rejects password shorter than 8 characters', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(tooShortPasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must be at least 8 characters long');
    });

    it('rejects password missing an uppercase letter', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(noUppercasePasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must contain an uppercase letter');
    });

    it('rejects password missing a lowercase letter', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(noLowercasePasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must contain a lowercase letter');
    });

    it('rejects password missing a number', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(noNumberPasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must contain a number');
    });

    it('rejects password missing a special character', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(noSpecialCharPasswordDto)
            .expect(400);
        expect(res.body.message).toContain('Password must contain a special character');
    });
    it('rejects duplicate email registration with 409 CONFLICT', async () => {
        const dto = makeRegisterDto();

        await request(app.getHttpServer()).post('/auth/register').send(dto).expect(201);

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(dto)
            .expect(409);

        expect(res.body.errorCode).toBe('CONFLICT');
        expect(res.body.message).toBe('A user with this email already exist');
    });
});