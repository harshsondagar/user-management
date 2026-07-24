import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from "cookie-parser"
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppException } from './common/exceptions/app.exception';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.use(RequestIdMiddleware)

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
      return new AppException('VALIDATION_ERROR', messages.join('; '), HttpStatus.BAD_REQUEST);
    }
  }))

  app.use(cookieParser())

  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(app.get(Reflector)),
  );

  process.on('unhandledRejection', (reason) => {
    Logger.error('Unhandled Rejection', reason);
  });

  process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception', error.stack);
    process.exit(1);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
