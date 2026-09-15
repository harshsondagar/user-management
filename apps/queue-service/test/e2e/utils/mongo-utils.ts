import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dataset, SyncSkip } from '../../../src/db/schemas';

export function getDatasetModel(app: INestApplication): Model<Dataset> {
    return app.get<Model<Dataset>>(getModelToken(Dataset.name));
}


export function getSyncSkipModel(app: INestApplication): Model<SyncSkip> {
    return app.get<Model<SyncSkip>>(getModelToken(SyncSkip.name));
}

export async function clearDatasets(app: INestApplication): Promise<void> {
    await Promise.all([
        getDatasetModel(app).deleteMany({}),
        getSyncSkipModel(app).deleteMany({}),
    ]);
}