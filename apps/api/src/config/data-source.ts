// import { config } from 'dotenv';
// import { resolve } from 'path';
// config({ path: resolve(__dirname, '../../.env') })

// import path from "path";
// import { DataSource } from "typeorm";


// export const dataSource: DataSource = new DataSource({
//     type: 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     port: parseInt(process.env.DB_PORT!) || 5432,
//     username: process.env.DB_USERNAME!,
//     password: process.env.DB_PASSWORD!,
//     database: process.env.DB_NAME!,
//     synchronize: false,
//     entities: [path.join(__dirname, '../**/*-entity.ts')],
//     migrations: [path.join(__dirname, '../migration/*.{ts,js}')],
// })



import { config } from 'dotenv';
import { resolve } from 'path';
import path from "path";
import { DataSource } from "typeorm";

const isTest = process.env.NODE_ENV === 'test';

config({
    path: resolve(__dirname, isTest ? '../test/.env.test' : '../../.env'),
});

export const dataSource: DataSource = new DataSource({
    type: 'postgres',
    host: isTest ? (process.env.TEST_POSTGRES_HOST || 'localhost') : (process.env.DB_HOST || 'localhost'),
    port: isTest ? Number(process.env.TEST_POSTGRES_PORT) : Number(process.env.DB_PORT || 5432),
    username: isTest ? process.env.TEST_POSTGRES_USER! : process.env.DB_USERNAME!,
    password: isTest ? process.env.TEST_POSTGRES_PASSWORD! : process.env.DB_PASSWORD!,
    database: isTest ? (process.env.DB_NAME || process.env.TEST_POSTGRES_DB!) : process.env.DB_NAME!,
    synchronize: false,
    entities: [
        isTest
            ? path.join(__dirname, '../**/*-entity.{ts,js}')
            : path.join(__dirname, '../**/*-entity.ts')
    ],
    migrations: [path.join(__dirname, '../migration/*.{ts,js}')],
});