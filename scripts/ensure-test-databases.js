const dotenv = require('dotenv')
const { Client } = require('pg');

const MAX_WORKERS = Number(process.env.TEST_MAX_WORKERS ?? 8);

dotenv.config()


async function main() {
    const client = new Client({
        host: process.env.TEST_POSTGRES_HOST ?? 'localhost',
        port: Number(process.env.TEST_POSTGRES_PORT ?? 5433),
        user: process.env.TEST_POSTGRES_USER ?? 'test',
        password: process.env.TEST_POSTGRES_PASSWORD ?? 'test',
        database: 'postgres',
    });


    await client.connect();

    const { rows } = await client.query('SELECT datname FROM pg_database');
    const existing = new Set(rows.map((r) => r.datname));

    for (let i = 1; i <= MAX_WORKERS; i++) {
        const dbName = `test_db_${i}`;
        if (!existing.has(dbName)) {
            await client.query(`CREATE DATABASE "${dbName}"`);
            // console.log(`Created ${dbName}`);
        }
    }

    await client.end();
}

main().catch((err) => {
    console.error('Failed to provision test databases:', err);
    process.exit(1);
});