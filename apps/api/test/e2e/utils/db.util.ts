import { DataSource } from 'typeorm';
const SEED_TABLES = new Set(['plans', 'features', 'plan_entitlements']);
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
    const entities = dataSource.entityMetadatas;
    await dataSource.query('SET session_replication_role = replica;');
    for (const entity of entities) {
        if (SEED_TABLES.has(entity.tableName)) continue; // r
        await dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await dataSource.query('SET session_replication_role = origin;');
}