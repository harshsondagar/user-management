export function testEnv() {
    const workerId = process.env.JEST_WORKER_ID ?? '1';
    return {
        dbName: `test_db_${workerId}`,
        redisDb: parseInt(workerId, 10),
        mongoDbName: `test_mongo_${workerId}`,

        postgresHost: process.env.TEST_POSTGRES_HOST ?? 'localhost',
        postgresPort: Number(process.env.TEST_POSTGRES_PORT ?? 5434),
        redisHost: process.env.TEST_REDIS_HOST ?? 'localhost',
        redisPort: Number(process.env.TEST_REDIS_PORT ?? 6380),
        mongoHost: process.env.TEST_MONGO_HOST ?? 'localhost',
        mongoPort: Number(process.env.TEST_MONGO_PORT ?? 27018),
    };
}