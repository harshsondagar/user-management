import "dotenv/config"
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus, CanActivate, ExecutionContext } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { MailService } from '../../../src/mail/mail.service';
import { SuperAdminSeed } from '../../../src/seed/super-admin-seed';
import { CustomThrottlerGuard } from '../../../src/throttler/custom-throttler.guard'; // ← correct path
import { AppException } from '../../../src/common/exceptions/app.exception';
import { mockMailService } from './mock-mail.util';
import { Reflector } from '@nestjs/core';
import { ResponseEnvelopeInterceptor } from '../../../src/common/interceptors/response-envelope.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

jest.mock('@css-inline/css-inline', () => ({
    inline: (html: string) => html,
    CSSInliner: class {
        inline(html: string) {
            return html;
        }
    },
}));

class NoopThrottlerGuard implements CanActivate {
    canActivate(_context: ExecutionContext): boolean {
        return true;
    }
}

export async function createTestApp(): Promise<INestApplication> {

    const workerId = process.env.JEST_WORKER_ID ?? '1';
    process.env.DB_NAME = `test_db_${workerId}`;
    process.env.REDIS_DB = workerId;

    jest.spyOn(CustomThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(MailService)
        .useValue(mockMailService)
        .overrideProvider(SuperAdminSeed)
        .useValue({ onModuleInit: () => Promise.resolve() })
        .overrideGuard(CustomThrottlerGuard)
        .useClass(NoopThrottlerGuard)
        .compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();

    app.useStaticAssets(join(__dirname, '../../../public'));
    app.setBaseViewsDir(join(__dirname, '../../../views'));
    app.setViewEngine('ejs');

    app.useGlobalInterceptors(
        new ResponseEnvelopeInterceptor(app.get(Reflector)),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (errors) => {
                const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
                return new AppException('VALIDATION_ERROR', messages.join('; '), HttpStatus.BAD_REQUEST);
            },
        }),
    );

    await app.init();
    return app;
}

export async function createTestAppWithThrottler(): Promise<INestApplication> {

    const workerId = process.env.JEST_WORKER_ID ?? '1';
    process.env.DB_NAME = `test_db_${workerId}`;
    process.env.REDIS_DB = workerId;

    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(MailService)
        .useValue(mockMailService)
        .overrideProvider(SuperAdminSeed)
        .useValue({ onModuleInit: () => Promise.resolve() })
        .compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();

    app.useStaticAssets(join(__dirname, '../../../public'));
    app.setBaseViewsDir(join(__dirname, '../../../views'));
    app.setViewEngine('ejs');

    app.useGlobalInterceptors(
        new ResponseEnvelopeInterceptor(app.get(Reflector)),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (errors) => {
                const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
                return new AppException('VALIDATION_ERROR', messages.join('; '), HttpStatus.BAD_REQUEST);
            },
        }),
    );

    await app.init();
    return app;
}