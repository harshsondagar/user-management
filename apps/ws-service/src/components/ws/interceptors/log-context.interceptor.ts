import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { logContextStore, WsLogContext } from '@app/shared';

@Injectable()
export class LogContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const client = context.switchToWs().getClient<Socket>();
        const event = context.switchToWs().getPattern();

        const ctx: WsLogContext = {
            type: 'WebSocket',
            socketId: client.id,
            userId: client.data?.userId,
            event,
        };

        return new Observable((subscriber) => {
            logContextStore.run(ctx, () => {
                next.handle().subscribe({
                    next: (v) => subscriber.next(v),
                    error: (e) => subscriber.error(e),
                    complete: () => subscriber.complete(),
                });
            });
        });
    }
}