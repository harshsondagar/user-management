import { Cron, CronExpression } from "@nestjs/schedule"
import { Injectable, Logger } from "@nestjs/common"
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream, createReadStream } from "fs";

// const GZIP_AFTER_MS = 48 * 60 * 60 * 1000;
// const DELETE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const GZIP_AFTER_MS = 15 * 1000; // 30 seconds, TEMP for testing
const DELETE_AFTER_MS = 30 * 1000;

@Injectable()
export class LogCleanupService {
    private readonly logger = new Logger(LogCleanupService.name);
    private readonly logsDir = path.join(process.cwd(), 'logs');

    constructor(private readonly serviceName: string) { }

    @Cron(CronExpression.EVERY_HOUR)
    async cleanup() {
        try {

            const files = await fs.readdir(this.logsDir)

            const now = Date.now()

            for (const file of files) {

                if (file.endsWith('-audit.json')) continue;
                if (!file.startsWith(this.serviceName)) continue;

                const filePath = path.join(this.logsDir, file)
                const stat = await fs.stat(filePath)

                if (!stat.isFile()) continue;

                const age = now - stat.mtimeMs;

                if (file.endsWith('.log') && age >= GZIP_AFTER_MS) {
                    await this.gzipFile(filePath)
                } else if (file.endsWith('.log.gz') && age >= DELETE_AFTER_MS) {
                    await fs.unlink(filePath)
                    this.logger.log(`Deleted old log archive: ${file}`);
                }
            }
        } catch (error: unknown) {
            this.logger.error(`Log cleanup sweep failed: ${(error as Error).message}`);
        }
    }

    private async gzipFile(filePath: string): Promise<void> {
        const gzPath = `${filePath}.gz`

        try {
            await pipeline(
                createReadStream(filePath),
                zlib.createGzip(),
                createWriteStream(gzPath)
            )
            await fs.unlink(filePath)
            this.logger.log(`Compressed log file: ${path.basename(filePath)} → ${path.basename(gzPath)}`);
        } catch (error: unknown) {
            this.logger.error(`Failed to gzip ${filePath}: ${(error as Error).message}`);
        }
    }

}



