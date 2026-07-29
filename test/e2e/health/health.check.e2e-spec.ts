import { INestApplication } from "@nestjs/common"
import { DataSource } from "typeorm"
import { createTestApp } from "../utils/app-factory.util"
import { truncateAllTables } from "../utils/db.util"
import request from "supertest"

describe('Health - check (e2e)', () => {

    let app: INestApplication
    let dataSource: DataSource

    beforeAll(async () => {
        app = await createTestApp()
        dataSource = await app.get(DataSource)
        await truncateAllTables(dataSource)
    })

    afterEach(async () => {
        await truncateAllTables(dataSource)
    })

    afterAll(async () => {
        await app.close()
    })


    describe('GET /health-check', () => {
        it('returns 200 with all indicators up, without authentication', async () => {
            const res = await request(app.getHttpServer())
                .get("/health")
                .expect(200)

            expect(res.body.data.info).toMatchObject({
                "database": {
                    "status": "up"
                },
                "redis": {
                    "status": "up"
                },
                "memory_heap": {
                    "status": "up"
                },
                "check_storage": {
                    "status": "up"
                }
            })
        })

        it('never gets rate-limited, even after many rapid requests', async () => {
            for (let i = 0; i < 20; i++) {
                const res = await request(app.getHttpServer()).get('/health');
                expect(res.status).toBe(200);
            }
        });

        it('returns the correct Terminus response contract keys', async () => {
            const res = await request(app.getHttpServer()).get('/health').expect(200);

            expect(res.body.data).toHaveProperty('status', 'ok');
            expect(res.body.data).toHaveProperty('info');
            expect(res.body.data).toHaveProperty('error');
            expect(res.body.data).toHaveProperty('details');
        });
    })
})