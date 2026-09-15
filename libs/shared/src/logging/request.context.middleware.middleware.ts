import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { HttpLogContext } from "../type/type"
import { logContextStore } from './log-context';


@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const requestId = (req.headers['x-request-id'] as string) || randomUUID();
        req.headers['x-request-id'] = requestId; // so downstream internal HTTP calls can forward it
        res.setHeader('x-request-id', requestId);

        const context: HttpLogContext = {
            type: 'http',
            requestId,
            method: req.method,
            path: req.originalUrl ?? req.url,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        };

        logContextStore.run(context, () => next());
    }
}


