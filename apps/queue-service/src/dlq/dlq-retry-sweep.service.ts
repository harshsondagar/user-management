import { Injectable, Logger } from "@nestjs/common";
import { DlqService } from "./dlq.service";
import { DatagovResourceService } from "../data-gov/datagov-resource.service";
import { InjectModel } from "@nestjs/mongoose";
import { Dataset } from "@app/shared"
import { Model } from "mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";


console.log("running");

@Injectable()
export class DlqRetrySweepService {
    private readonly logger = new Logger(DlqRetrySweepService.name);

    constructor(
        private readonly dlqService: DlqService,
        private readonly resource: DatagovResourceService,
        @InjectModel(Dataset.name) private readonly datasetModel: Model<Dataset>,
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async sweep() {

        const pending = await this.dlqService.getPendingRetries()

        if (pending.length === 0) {
            return;
        }

        this.logger.log(`DLQ sweep: retrying ${pending.length} pending resource(s)`);

        for (const entry of pending) {
            try {
                const resourceData = await this.resource.fetchResource({
                    resourceId: entry.resourceId!,
                    limit: 100,
                });
                const records = resourceData.records ?? [];

                if (records.length > 0) {
                    await this.datasetModel.updateOne(
                        { resourceId: entry.resourceId },
                        {
                            $set: {
                                nid: entry.nid,
                                resourceId: entry.resourceId,
                                title: entry.title,
                                records,
                                recordCount: records.length,
                                fetchedAt: new Date(),
                            },
                        },
                        { upsert: true },
                    );
                    await this.dlqService.markResolved(entry.id);
                    this.logger.log(`✓ DLQ retry succeeded: ${entry.title} [${entry.resourceId}]`);
                } else {
                    await this.dlqService.markResolved(entry.id);
                    this.logger.log(`○ DLQ retry: still zero records, resolving as empty: ${entry.title}`);
                }
            } catch (err: any) {
                await this.dlqService.markPermanentlyFailed(entry.id, err.message);
                this.logger.warn(`✗ DLQ retry failed again, permanently failing: ${entry.title} — ${err.message}`);
            }

            await this.sleep(2000);
        }
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}