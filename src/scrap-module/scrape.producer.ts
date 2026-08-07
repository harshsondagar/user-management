import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { privateDecrypt } from "crypto";

@Injectable()
export class ScrapeProducer {
    constructor(@InjectQueue('scrape-gov-data') private readonly queue: Queue) {

    }

    async triggerScrape(query: string, userId: string) {
        return this.queue.add('scrape-search-page', { query, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
    }

}