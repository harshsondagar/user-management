import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from '../utils/app-factory.util';
import { truncateAllTables } from '../utils/db.util';
import { makeRegisterDto } from '../../fixtures/users.fixture';
import { createAuthenticatedUser } from '../utils/auth-helper.util';

describe('User - Follower/Following Lists (e2e)', () => {

    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        app = await createTestApp();
        dataSource = app.get(DataSource);
        await truncateAllTables(dataSource);
    });

    afterEach(async () => {
        jest.useRealTimers();
        await truncateAllTables(dataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /user/me/followers', () => {
        it('returns an empty array for a user with no followers', async () => {
            const registerDto = makeRegisterDto();
            const { accessToken } = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data).toHaveLength(0);
        });

        it('returns the correct followers once a follow request is accepted', async () => {
            const dtoA = makeRegisterDto();
            const dtoB = makeRegisterDto();
            const userA = await createAuthenticatedUser(app, dtoA);
            const userB = await createAuthenticatedUser(app, dtoB);

            // userA follows userB
            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(201);

            // userB accepts
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(201);

            // userB's followers list should now include userA
            const res = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({ followerId: userA.id });
        });

        it('does not leak another user\'s followers', async () => {
            const dtoA = makeRegisterDto();
            const dtoB = makeRegisterDto();
            const dtoC = makeRegisterDto();
            const userA = await createAuthenticatedUser(app, dtoA);
            const userB = await createAuthenticatedUser(app, dtoB);
            const userC = await createAuthenticatedUser(app, dtoC);

            // userA follows userC, gets accepted
            await request(app.getHttpServer())
                .post(`/user/${userC.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`);
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userC.accessToken}`);

            // userB (unrelated) should see an empty followers list, not userC's
            const res = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${userB.accessToken}`)
                .expect(200);

            expect(res.body.data).toHaveLength(0);
        });

        it('rejects without authentication', async () => {
            await request(app.getHttpServer()).get('/user/me/followers').expect(401);
        });

        it('rejects with a malformed token', async () => {
            const registerDto = makeRegisterDto();
            const { accessToken } = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${accessToken}tampered`)
                .expect(401);

            expect(res.body.message).toContain('invalid signature');
        });

        it('rejects with a genuinely expired token', async () => {
            const registerDto = makeRegisterDto();
            const { accessToken } = await createAuthenticatedUser(app, registerDto);

            jest.useFakeTimers({ advanceTimers: true });
            jest.setSystemTime(Date.now() + 20 * 60 * 1000);

            const res = await request(app.getHttpServer())
                .get('/user/me/followers')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(401);

            expect(res.body.message).toContain('jwt expired');
            jest.useRealTimers();
        });
    });

    describe('GET /user/me/following', () => {
        it('returns an empty array for a user following no one', async () => {
            const registerDto = makeRegisterDto();
            const { accessToken } = await createAuthenticatedUser(app, registerDto);

            const res = await request(app.getHttpServer())
                .get('/user/me/following')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(res.body.data).toHaveLength(0);
        });

        it('returns the correct following list once accepted', async () => {
            const dtoA = makeRegisterDto();
            const dtoB = makeRegisterDto();
            const userA = await createAuthenticatedUser(app, dtoA);
            const userB = await createAuthenticatedUser(app, dtoB);

            await request(app.getHttpServer())
                .post(`/user/${userB.id}/follow`)
                .set('Authorization', `Bearer ${userA.accessToken}`);
            await request(app.getHttpServer())
                .post(`/user/${userA.id}/follow/accept`)
                .set('Authorization', `Bearer ${userB.accessToken}`);

            const res = await request(app.getHttpServer())
                .get('/user/me/following')
                .set('Authorization', `Bearer ${userA.accessToken}`)
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({ followingId: userB.id });
        });

        it('rejects without authentication', async () => {
            await request(app.getHttpServer()).get('/user/me/following').expect(401);
        });
    });
});