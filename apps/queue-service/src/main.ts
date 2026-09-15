import "dotenv/config"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as ejs from 'ejs';
import { WinstonModule } from "nest-winston";
import { getWinstonConfig } from "@app/shared";


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(getWinstonConfig('queue-service'))
  });


  app.useStaticAssets(join(__dirname, 'public'));
  app.engine('ejs', ejs.renderFile);
  app.setBaseViewsDir(join(__dirname, 'views'));
  app.setViewEngine('ejs');

  app.set('trust proxy', 1);


  await app.listen(3001);
}
bootstrap();
