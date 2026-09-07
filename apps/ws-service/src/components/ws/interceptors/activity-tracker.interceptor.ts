// interceptors/activity-tracker.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { RoomsService } from '../service/room-service';

@Injectable()
export class ActivityTrackerInterceptor implements NestInterceptor {
    constructor(private readonly rooms: RoomsService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const client = context.switchToWs().getClient<Socket>();
        this.rooms.touchLastSeen(client.id);
        return next.handle();
    }
}