import { DataSource } from "typeorm"
import { QueryRunner } from "typeorm/browser"
import { bindRepositoriesToTransaction, createTestApp } from "../utils/app-factory.util"
import { INestApplication } from "@nestjs/common"
import { truncateAllTables } from "../utils/db.util"
import request from "supertest"
import { validRegisterDto } from "../../fixtures/users.fixture"

describe('AUTH - Register (e2e)', () => {
    let app: INestApplication
    let dataSource: DataSource
    let queryRunner: QueryRunner

    beforeAll(async () => {
        app = await createTestApp()
        dataSource = app.get(DataSource)
    })

    afterEach(async () => {
        await truncateAllTables(app.get(DataSource))
    })

    afterAll(async () => {
        await app.close()
    })

    it('should register a new user and return 201', async () => {
        const res = await request(app.getHttpServer()).post('/auth/register')
            .send(validRegisterDto)
            .expect(201)

        expect(res.body.email).toBe(validRegisterDto.email)
    })

    it('should reject duplicate email verification', async () => {
        await request(app.getHttpServer())
            .post('/auth/register')
            .send(validRegisterDto)

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(validRegisterDto)
            .expect(409)

        expect(res.body.errorCode).toBe('CONFLICT')
    })

    it('registers successfully with valid data', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(validRegisterDto)
            .expect(201);

        expect(res.body.email).toBe(validRegisterDto.email);
    });

    it('registers successfully without optional firstName/lastName', async () => {
        await request(app.getHttpServer())
            .post('/auth/register')
            .send(minimalValidRegisterDto)
            .expect(201);
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

    it('rejects a weak password failing all complexity rules', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(weakPasswordDto)
            .expect(400);

        expect(res.body.message).toContain('Password must contain a lowercase letter');
        expect(res.body.message).toContain('Password must contain an uppercase letter');
        expect(res.body.message).toContain('Password must contain a number');
        expect(res.body.message).toContain('Password must contain a special character');
    });

    it('rejects duplicate email registration', async () => {
        await request(app.getHttpServer()).post('/auth/register').send(validRegisterDto);

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(validRegisterDto)
            .expect(409);

        expect(res.body.errorCode).toBe('EMAIL_ALREADY_EXISTS');
    });
})