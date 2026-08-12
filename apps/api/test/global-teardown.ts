import * as dotenv from "dotenv"
import { join, resolve } from "path";
import { Client } from 'pg';

const WORKER_COUNT = 4;
dotenv.config({ path: resolve(join(process.cwd(), "apps/api/.env")) });

const TEST_DB_HOST = process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost';
const TEST_DB_PORT = parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432', 10);
const TEST_DB_USER = process.env.TEST_DB_USERNAME || process.env.DB_USERNAME!;
const TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD!;
const TEST_DB = process.env.DB_NAME!;


export default async function globalTeardown() {
    const client = new Client({
        host: TEST_DB_HOST,
        port: TEST_DB_PORT,
        user: TEST_DB_USER,
        password: TEST_DB_PASSWORD!,
        database: TEST_DB!,
    });

    await client.connect();



    for (let i = 1; i <= WORKER_COUNT; i++) {
        const dbName = `test_db_${i}`

        await client.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [dbName]);

        // await new Promise((resolve) => setTimeout(resolve, 500));
        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    }

    await client.end();
}
