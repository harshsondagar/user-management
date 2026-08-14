// queue-service/test/e2e/utils/internal-api-utils.ts
import request from 'supertest';

export function internalRequest(app: import('@nestjs/common').INestApplication) {
    return {
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set('x-internal-secret', process.env.INTERNAL_SERVICE_SECRET!),
        post: (url: string) =>
            request(app.getHttpServer()).post(url).set('x-internal-secret', process.env.INTERNAL_SERVICE_SECRET!),
    };
}