import { INestApplication } from "@nestjs/common";
import { createAuthenticatedUser, createTwoAuthenticatedUsers } from "../utils/auth-helper.util";
import { DataSource } from "typeorm";
import { truncateAllTables } from "../utils/db.util";
import request from "supertest"
import { createTestApp } from "../utils/app-factory.util";
import { makeRegisterDto } from "../../fixtures/users.fixture";


describe('User - Block (e2e)', () => {
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

    describe('POST /user/:targetId/block', () => {

        it('blocks a user successfully', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);
        });

        it('removes an existing relationship where blocker was following the target', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            const followingRes = await request(app.getHttpServer())
                .get('/user/me/following')
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(200);

            expect(followingRes.body.data).toHaveLength(0);
        });

        it('removes an existing relationship where the target was following the blocker', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);
            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow/accept`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            const followersRes = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(200);

            expect(followersRes.body.data).toHaveLength(0);
        });

        it('prevents a blocked-by user from sending a new follow request to the blocker', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow`)
                .set('Authorization', `Bearer ${userB.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

        it('rejects blocking yourself with 409 CONFLICT', async () => {
            const registerDto = makeRegisterDto();
            const user = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .post(`/user/${user.id}/block`)
                .set('Authorization', `Bearer ${user.accessToken}`)
                .expect(409);

            expect(res.body.errorCode).toBe('CONFLICT');
        });

        it('rejects without authentication', async () => {
            const { userA } = await createTwoAuthenticatedUsers(app);
            await request(app.getHttpServer()).post(`/user/${userA.id}/block`).expect(401);
        });
    })

    describe('DELETE /user/:targetId/block (unblock)', () => {
        it('unblocks a previously blocked user', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .delete(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(200);
        });

        it('rejects unblocking someone who was never blocked', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .delete(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(404);
        });

        it('allows following again after being unblocked', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .delete(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(200);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);
        });

        it('rejects without authentication', async () => {
            const { userA } = await createTwoAuthenticatedUsers(app);
            await request(app.getHttpServer()).delete(`/user/${userA.id}/block`).expect(401);
        });
    })
})
