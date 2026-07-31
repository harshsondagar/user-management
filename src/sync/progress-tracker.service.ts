import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProgressState {
    lastOffset: number;
    processedNids: number[];
    failedNids: { nid: number; error: string }[];
    updatedAt: string;
}
@Injectable()

export class ProgressTrackerService {
    private readonly logger = new Logger(ProgressTrackerService.name);
    private readonly filePath = path.join(process.cwd(), 'sync-progress.json');

    async load(): Promise<ProgressState> {
        try {
            const raw = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return { lastOffset: 0, processedNids: [], failedNids: [], updatedAt: new Date().toISOString() };
        }
    }

    async save(state: ProgressState) {
        state.updatedAt = new Date().toISOString();
        await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
    }

    async reset() {
        const fresh: ProgressState = {
            lastOffset: 0,
            processedNids: [],
            failedNids: [],
            updatedAt: new Date().toISOString(),
        };
        await this.save(fresh);
        return fresh;
    }

}