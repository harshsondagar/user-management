
export async function flushTestRedis(): Promise<void> {
    const Redis = require('ioredis');
    const client = new Redis({ host: 'localhost', port: 6379 });
    await client.flushdb();
    await client.quit();
}