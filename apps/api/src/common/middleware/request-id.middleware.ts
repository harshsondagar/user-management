import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidV4 } from 'uuid'


@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const requestId = (req.headers['x-request-id'] as string) || uuidV4()

        req.headers['x-request-id'] = requestId;
        res.setHeader('x-request-id', requestId);
        next()
    }
}