import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser } from 'playwright';

@Injectable()
export class PlaywrightScraperService implements OnModuleDestroy {
    private browser: Browser | null = null;

    private async getBrowser() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
        }
        return this.browser;
    }

    async scrapeRenderedPage(url: string): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            return await page.content();
        } finally {
            await page.close();
        }
    }

    async onModuleDestroy() {
        if (this.browser) await this.browser.close();
    }
}