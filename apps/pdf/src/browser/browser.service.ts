import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BrowserService.name);
    private browser: Browser | null = null;
    private launching: Promise<Browser> | null = null;

    async onModuleInit() {
        await this.getBrowser();
    }

    async onModuleDestroy() {
        await this.browser?.close();
    }

    private async getBrowser(): Promise<Browser> {
        if (this.browser?.connected) return this.browser;


        if (!this.launching) {
            this.launching = puppeteer
                .launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                })
                .then((b) => {
                    this.browser = b;
                    b.on('disconnected', () => {
                        this.logger.warn('Chrome disconnected, will relaunch on next request');
                        this.browser = null;
                    });
                    return b;
                })
                .finally(() => (this.launching = null));
        }
        return this.launching;
    }

    async htmlToPdf(html: string): Promise<Buffer> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const url = req.url();
                url.startsWith('data:') || url === 'about:blank' ? req.continue() : req.abort();
            });

            await page.setContent(html, { waitUntil: 'load' });
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            });
            return Buffer.from(pdf);
        } finally {
            await page.close();
        }
    }
}