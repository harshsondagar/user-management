import { NestFactory } from '@nestjs/core';
import { QueueServiceModule } from './queue-service.module';

async function bootstrap() {
  const app = await NestFactory.create(QueueServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
