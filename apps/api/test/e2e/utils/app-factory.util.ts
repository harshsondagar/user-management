import "dotenv/config"
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus, CanActivate, ExecutionContext } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { SuperAdminSeed } from '../../../src/seed/super-admin-seed';
import { CustomThrottlerGuard } from '../../../src/throttler/custom-throttler.guard'; // ← correct path
import { AppException } from '../../../src/common/exceptions/app.exception';
import { Reflector } from '@nestjs/core';
import { ResponseEnvelopeInterceptor } from '../../../src/common/interceptors/response-envelope.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { BillingSeedService } from "../../../src/billing/seed/billing.seed";
import { BillingModule } from "../../../src/billing/billing.module";
import { UserService } from "../../../src/user/user.service";

jest.mock('@css-inline/css-inline', () => ({
    inline: (html: string) => html,
    CSSInliner: class {
        inline(html: string) {
            return html;
        }
    },
}));

interface CreateTestAppOptions {
    bypassThrottler?: boolean; // default true
}


class NoopThrottlerGuard implements CanActivate {
    canActivate(_context: ExecutionContext): boolean {
        return true;
    }
}

export async function createTestApp(
    options: CreateTestAppOptions = {},
): Promise<INestApplication> {

    const { bypassThrottler = true } = options;

    const workerId = process.env.JEST_WORKER_ID ?? '1';
    process.env.DB_NAME = `test_db_${workerId}`;
    process.env.REDIS_DB = workerId;

    const builder = Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(SuperAdminSeed,)
        .useValue({ onModuleInit: () => Promise.resolve() })
        .overrideProvider(BillingSeedService)
        .useValue({ onModuleInit: () => Promise.resolve() })
        .overrideProvider(BillingModule)
        .useValue({ onModuleInit: () => Promise.resolve() });


    if (bypassThrottler) {
        jest.spyOn(CustomThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);
        builder.overrideGuard(CustomThrottlerGuard).useClass(NoopThrottlerGuard);
    }

    const moduleRef = await builder.compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();


    const userService = app.get(UserService);
    jest.spyOn(userService as any, 'assignFreePlan').mockResolvedValue(true);

    app.useStaticAssets(join(__dirname, '../../../public'));
    app.setBaseViewsDir(join(__dirname, '../../../../../views'));
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
    app.useLogger(['fatal'])
    await app.init();

    return app;
}
// export async function createTestAppWithThrottler(): Promise<INestApplication> {

//     const workerId = process.env.JEST_WORKER_ID ?? '1';
//     process.env.DB_NAME = `test_db_${workerId}`;
//     process.env.REDIS_DB = workerId;

//     const moduleRef = await Test.createTestingModule({
//         imports: [AppModule],
//     })
//         .overrideProvider(MailModule)
//         .useValue(mockMailService)
//         .overrideProvider(SuperAdminSeed)
//         .useValue({ onModuleInit: () => Promise.resolve() })
//         .compile();

//     const app = moduleRef.createNestApplication<NestExpressApplication>();

//     app.useStaticAssets(join(__dirname, '../../../public'));
//     app.setBaseViewsDir(join(__dirname, '../../../../../views'));
//     app.setViewEngine('ejs');

//     app.useGlobalInterceptors(
//         new ResponseEnvelopeInterceptor(app.get(Reflector)),
//     );

//     app.useGlobalPipes(
//         new ValidationPipe({
//             whitelist: true,
//             forbidNonWhitelisted: true,
//             transform: true,
//             exceptionFactory: (errors) => {
//                 const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
//                 return new AppException('VALIDATION_ERROR', messages.join('; '), HttpStatus.BAD_REQUEST);
//             },
//         }),
//     );

//     await app.init();
//     return app;
// }