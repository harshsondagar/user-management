// apps/pdf/src/pdf.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PDF_QUEUE, ReceiptStorageService } from '@app/shared';
import { BrowserService } from './browser/browser.service';
import { ReceiptProcessor } from './receipt/receipt.processor';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/pdf/.env',
      load: [configuration],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
        },
      }),
    }),

    BullModule.registerQueue({ name: PDF_QUEUE }),
  ],
  providers: [BrowserService, ReceiptProcessor, ReceiptStorageService],
})
export class PdfModule { }