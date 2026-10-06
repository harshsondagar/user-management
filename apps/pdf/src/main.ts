// apps/pdf/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { getWinstonConfig } from '@app/shared';
import { PdfModule } from './pdf.module';

async function bootstrap() {
  const app = await NestFactory.create(PdfModule, {
    logger: WinstonModule.createLogger(getWinstonConfig('pdf')),
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(process.env.PDF_PORT ?? 4010);
}
bootstrap();