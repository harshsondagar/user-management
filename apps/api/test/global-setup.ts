import * as  dotenv from "dotenv"
import path, { join, resolve } from "path";
import { Client } from "pg"
import { DataSource } from "typeorm";


dotenv.config({ path: resolve(join(process.cwd(), "apps/api/test/.env.test")) });
const WORKER_COUNT = 4


export default async function globalSetup() {

    const TEST_DB_HOST = process.env.TEST_POSTGRES_HOST || 'localhost';
    const TEST_DB_PORT = parseInt(process.env.TEST_POSTGRES_PORT!, 10);
    const TEST_DB_USER = process.env.TEST_POSTGRES_USER!
    const TEST_DB_PASSWORD = process.env.TEST_POSTGRES_PASSWORD!
    const TEST_DB = process.env.TEST_POSTGRES_DB!;

    const adminClient = new Client({
        host: TEST_DB_HOST,
        port: TEST_DB_PORT,
        user: TEST_DB_USER,
        password: TEST_DB_PASSWORD,
        database: TEST_DB!,
    });

    await adminClient.connect();

    for (let i = 1; i <= WORKER_COUNT; i++) {
        const dbName = `test_db_${i}`;

        // await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
        await adminClient.query(`CREATE DATABASE ${dbName}`);

        const ds = new DataSource({
            type: 'postgres',
            host: TEST_DB_HOST,
            port: TEST_DB_PORT,
            username: TEST_DB_USER,
            password: TEST_DB_PASSWORD,
            database: dbName,
            entities: [path.join(__dirname, '../src/**/*-entity.{ts,js}')],
            migrations: [path.join(__dirname, '../src/migration/*.{ts,js}')],
        });


        await ds.initialize();
        await ds.runMigrations();
        await ds.query(`
            INSERT INTO plans (id, code, name, amount, currency, rank, "isActive", "gracePeriodDays")
            VALUES (gen_random_uuid(), 'free', 'Free', 0, 'inr', 0, true, 0)
            ON CONFLICT (code) DO NOTHING
        `);

        await ds.destroy();
    }

    await adminClient.end();
}

