import "dotenv/config"
import path from "path";
import { DataSource } from "typeorm";

export const dataSource: DataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT!) || 5432,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    synchronize: false,
    entities: ['src/**/*-entity.ts'],
    migrations: [path.join(__dirname, '../migration/*.{ts,js}')],
})