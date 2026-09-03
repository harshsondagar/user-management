import { NestFactory } from '@nestjs/core';
import { WsServiceModule } from './ws-service.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(WsServiceModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false
  }))
  await app.listen(process.env.port ?? 3002);
  console.log('WS-Service HTTP health check on port 3001, WS running on port 8080');
}
bootstrap();
