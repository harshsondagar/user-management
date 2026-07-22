import "dotenv/config"
import path, { dirname } from "path";
import { DataSource } from "typeorm";

console.log(path.join(__dirname, "/../*-entity.{ts,js}"));
export const dataSource: DataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT!) || 5432,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    synchronize: true,
    entities: [path.join(__dirname, '/../**/*-entity.{ts,js}')],
    migrations: [path.join(__dirname, 'migration/*.{ts,js}')],
})