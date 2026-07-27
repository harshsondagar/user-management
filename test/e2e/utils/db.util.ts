import { DataSource } from 'typeorm';

export async function truncateAllTables(dataSource: DataSource): Promise<void> {
    const entities = dataSource.entityMetadatas;
    await dataSource.query('SET session_replication_role = replica;');
    for (const entity of entities) {
        await dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await dataSource.query('SET session_replication_role = origin;');
}