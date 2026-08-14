import * as dotenv from "dotenv";
import path, { join, resolve } from "path";
import { Client } from "pg";
import { DataSource } from "typeorm";

dotenv.config({ path: resolve(join(process.cwd(), "apps/queue-service/test/.env.test")) });

const WORKER_COUNT = Number(process.env.TEST_MAX_WORKERS ?? 4);


export default async function globalSetup() {
    const TEST_DB_HOST = process.env.TEST_POSTGRES_HOST || 'localhost';
    const TEST_DB_PORT = parseInt(process.env.TEST_POSTGRES_PORT!, 10);
    const TEST_DB_USER = process.env.TEST_POSTGRES_USER!;
    const TEST_DB_PASSWORD = process.env.TEST_POSTGRES_PASSWORD!;

    const adminClient = new Client({
        host: TEST_DB_HOST,
        port: TEST_DB_PORT,
        user: TEST_DB_USER,
        password: TEST_DB_PASSWORD,
        database: 'postgres',
    });

    await adminClient.connect();

    try {
        const { rows } = await adminClient.query('SELECT datname FROM pg_database');
        const existing = new Set(rows.map((r) => r.datname));

        for (let i = 1; i <= WORKER_COUNT; i++) {
            const dbName = `test_db_${i}`;

            if (!existing.has(dbName)) {
                await adminClient.query(`CREATE DATABASE "${dbName}"`);
                console.log(`[global-setup] Created ${dbName}`);
            }

            const ds = new DataSource({
                type: 'postgres',
                host: TEST_DB_HOST,
                port: TEST_DB_PORT,
                username: TEST_DB_USER,
                password: TEST_DB_PASSWORD,
                database: dbName,
                entities: [path.join(__dirname, '../../src/**/*-entity.{ts,js}')],
                migrations: [path.join(__dirname, '../../src/migration/*.{ts,js}')],
            });

            await ds.initialize();
            await ds.runMigrations();
            await ds.destroy();
            console.log(`[global-setup] Migrated ${dbName}`);
        }
    } finally {
        await adminClient.end();
    }
}