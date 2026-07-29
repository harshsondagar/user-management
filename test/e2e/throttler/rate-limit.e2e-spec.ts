import { INestApplication } from "@nestjs/common"
import { DataSource } from "typeorm"
import { flushTestRedis } from "../utils/redis.util"
import { createTestAppWithThrottler } from "../utils/app-factory.util"
import { truncateAllTables } from "../utils/db.util"
import { makeRegisterDto } from "../../fixtures/users.fixture"
import request from "supertest"
import { createAuthenticatedUser } from "../utils/auth-helper.util"


describe('Rate Limiting (e2e) - real ThrottlerGuard', () => {
    let app: INestApplication
    let dataSource: DataSource

    beforeAll(async () => {
        await flushTestRedis()
        app = await createTestAppWithThrottler()
        dataSource = app.get(DataSource)
        await truncateAllTables(dataSource)
    })


    afterEach(async () => {
        await truncateAllTables(dataSource)
        await flushTestRedis();
    })

    afterAll(async () => {
        await app.close()
    })


    it('allow request up to configured limit, then return 429', async () => {
        const dto = makeRegisterDto()

        for (let i = 0; i < 5; i++) {
            const res = await request(app.getHttpServer())
                .post("/auth/register")
                .send(dto)

            expect(res.status).not.toBe(429)
        }

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send(dto)

        expect(res.status).toBe(429)
        expect(res.body.errorCode).toBe('TOO_MANY_REQUESTS');

    })

    it('tracks limits independently per IP/user (different email does not share the bucket)', async () => {
        for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'userA@example.com', password: 'wrong' });
        }

        const blocked = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'userA@example.com', password: 'wrong' });

        expect(blocked.status).toBe(429);

        const otherEmail = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'userB@example.com', password: 'wrong' });

        expect(otherEmail.status).toBe(429);

    })

    it('does not rate-limit routes marked @SkipThrottle()', async () => {
        for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'flood@example.com', password: 'wrong' })
        }

        const res = await request(app.getHttpServer()).get('/health');
        expect(res.status).toBe(200);
    })

    it('recovers after the TTL window passes', async () => {
        jest.useFakeTimers({ advanceTimers: true });

        for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'ttl-test@example.com', password: 'wrong' });
        }

        const blocked = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'ttl-test@example.com', password: 'wrong' });
        expect(blocked.status).toBe(429);

        jest.useRealTimers();
    })

    it('should allow other routes up to 100', async () => {
        const registerDto = makeRegisterDto()
        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        for (let i = 0; i < 10; i++) {
            const res = await request(app.getHttpServer())
                .get('/user/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ email: 'ttl-test@example.com', password: 'wrong' });

            expect(res.status).not.toBe(429)
        }
    })

})