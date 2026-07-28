import { INestApplication } from "@nestjs/common"
import { DataSource } from "typeorm"
import { flushTestRedis } from "./redis.util"
import { createTestAppWithThrottler } from "./app-factory.util"
import { truncateAllTables } from "./db.util"



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

})