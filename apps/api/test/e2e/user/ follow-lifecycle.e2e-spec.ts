import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from '../utils/app-factory.util';
import { truncateAllTables } from '../utils/db.util';
import { makeRegisterDto } from '../../fixtures/users.fixture';
import { createAuthenticatedUser, createTwoAuthenticatedUsers } from '../utils/auth-helper.util';

describe('User - Follow Lifecycle (e2e)', () => {
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
        if (dataSource && dataSource.isInitialized) {
            await dataSource.destroy();
        }

        await app.close();
    });

    describe('POST /user/:followingId/follow', () => {
        it('creates a follow request from one user to another', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            const res = await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            expect(res.body.data).toBeDefined();
        });

        it('rejects a duplicate follow request', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

        it('rejects following yourself', async () => {
            const registerDto = makeRegisterDto();
            const user = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .post(`/user/${user.id}/follow`)
                .set('Authorization', `Bearer ${user.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

        it('returns 404 for a non-existent target user', async () => {
            const registerDto = makeRegisterDto();
            const user = await createAuthenticatedUser(app, registerDto);

            await request(app.getHttpServer())
                .post('/user/00000000-0000-0000-0000-000000000000/follow')
                .set('Authorization', `Bearer ${user.accessToken}`)
                .expect(404);
        });

        it('rejects without authentication', async () => {
            const registerDto = makeRegisterDto();
            const user = await createAuthenticatedUser(app, registerDto);

            await request(app.getHttpServer())
                .post(`/user/${user.id}/follow`)
                .expect(401);
        });
    });

    describe('POST /user/:requesterId/follow/accept', () => {
        it('accepts a pending follow request', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);

            // verify side effect via followers list
            const followersRes = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(200);

            expect(followersRes.body.data).toContainEqual(
                expect.objectContaining({ followerId: userA.id }),
            );
        });

        it('rejects accepting a request that was never made', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(404);
        });

        // The critical IDOR test
        it('rejects a user accepting a request that was not directed at them', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);
            const userC = await createAuthenticatedUser(app, makeRegisterDto());

            // userA follows userB — a pending request now exists, targeted at userB
            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            // userC (unrelated) tries to accept it — must fail
            const res = await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userC.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.status).not.toBe(200);
            expect(res.status).not.toBe(201);
        });

        it('rejects without authentication', async () => {
            const { userA } = await createTwoAuthenticatedUsers(app);
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .expect(401);
        });
    });

    describe('POST /user/:requesterId/follow/reject', () => {
        it('rejects a pending follow request, removing it from pending', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/reject`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);

            // confirm userA is NOT in userB's followers after rejection
            const followersRes = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(200);

            expect(followersRes.body.data).toHaveLength(0);
        });

        it('rejects a user rejecting a request not directed at them', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);
            const userC = await createAuthenticatedUser(app, makeRegisterDto());

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/reject`)
                .set('Authorization', `Bearer ${userC.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('POST /user/:targetId/block', () => {
        it('blocks a user successfully', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/block`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);
        });

        it('removes an existing follow relationship when blocked', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`);
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userB.accessToken}`);

            // userB blocks userA, who was following them
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/block`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);

            const followersRes = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(200);

            expect(followersRes.body.data).toHaveLength(0);
        });

        it('prevents a blocked user from sending a new follow request', async () => {
            const { userA, userB } = await createTwoAuthenticatedUsers(app);

            await request(app.getHttpServer())
                .post(`/user/${userA.id}/block`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

        it('rejects blocking yourself', async () => {
            const registerDto = makeRegisterDto();
            const user = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .post(`/user/${user.id}/block`)
                .set('Authorization', `Bearer ${user.accessToken}`);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

        it('rejects without authentication', async () => {
            const { userA } = await createTwoAuthenticatedUsers(app);
            await request(app.getHttpServer()).post(`/user/${userA.id}/block`).expect(401);
        });
    });
});