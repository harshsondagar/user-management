// common/interceptors/response-envelope.interceptor.ts
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorator/response-message.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector) { }

    intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
        const message = this.reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            context.getHandler(),
        );

        return handler.handle().pipe(
            map((data) => ({
                success: true,
                ...(message ? { message } : {}),
                data: data ?? undefined,
            })),
        );
    }
}