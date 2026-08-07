import { DataSource } from "typeorm";
import { createTestApp } from "../utils/app-factory.util"
import { INestApplication } from "@nestjs/common";
import { truncateAllTables } from "../utils/db.util";
import request from "supertest"
import { makeRegisterDto } from "../../fixtures/users.fixture";
import { createAuthenticatedUser } from "../utils/auth-helper.util";



describe('User - GET me (e2e)', () => {

    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createTestApp()
        dataSource = app.get(DataSource)
        await truncateAllTables(dataSource)
    })

    afterEach(async () => {
        jest.useRealTimers();
        await truncateAllTables(dataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    it('return current user when authenticated', async () => {
        const registerDto = makeRegisterDto()

        const { accessToken, id } = await createAuthenticatedUser(app, registerDto)

        const res = await request(app.getHttpServer())
            .get("/user/me")
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)

        expect(res.body.data).toMatchObject({
            id,
            email: registerDto.email,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
        })
    })

    it('should reject without authentication', async () => {
        await request(app.getHttpServer())
            .get('/user/me')
            .expect(401)
    })

    it('rejects with a malformed token', async () => {
        const registerDto = makeRegisterDto()

        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        const res = await request(app.getHttpServer())
            .get('/user/me')
            .set("Authorization", `Bearer ${accessToken}h`)
            .expect(401)

        expect(res.body.message).toContain('Access Denied: invalid signature')
    })

    it('reject with expired token', async () => {
        const registerDto = makeRegisterDto()

        const { accessToken } = await createAuthenticatedUser(app, registerDto)

        jest.useFakeTimers({ advanceTimers: true });
        jest.setSystemTime(Date.now() + 20 * 60 * 1000);

        const res = await request(app.getHttpServer())
            .get('/user/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401)

        expect(res.body.message).toContain('Access Denied: jwt expired')
        jest.useRealTimers()
    })

})