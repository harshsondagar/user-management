
export async function flushTestRedis(): Promise<void> {
    const workerId = process.env.JEST_WORKER_ID ?? '1';
    const Redis = require('ioredis');
    const client = new Redis({ host: 'localhost', port: 6379, db: parseInt(workerId, 10) });
    await client.flushdb();
    await client.quit();
}