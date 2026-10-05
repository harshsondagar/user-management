import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WsServiceModule } from './ws-service.module';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { getWinstonConfig } from '@app/shared';
import { RedisIOAdepter } from './redis-io.adapter';


async function bootstrap() {
  const app = await NestFactory.create(WsServiceModule, {
    logger: WinstonModule.createLogger(getWinstonConfig('ws-service')),
  });

  const redisIOAdepter = new RedisIOAdepter(app);
  await redisIOAdepter.connectToRedis();
  app.useWebSocketAdapter(redisIOAdepter);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(Number(process.env.HTTP_PORT) || 3002);
  console.log(
    'WS-Service HTTP health check on port 3001, WS running on port 8080',
  );
}
bootstrap();
