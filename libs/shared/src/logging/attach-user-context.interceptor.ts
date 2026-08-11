import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { logContextStore } from './log-context';

@Injectable()
export class AttachUserContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const currentContext = logContextStore.get();

        if (currentContext.type === 'http' && request.user?.id) {
            (currentContext as any).userId = request.user.id;
        }

        return next.handle();
    }
}