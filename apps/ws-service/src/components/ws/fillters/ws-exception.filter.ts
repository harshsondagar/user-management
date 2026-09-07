
import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {

        const client = host.switchToWs().getClient<Socket>();

        const message = this.extractMessage(exception);

        client.emit('exception', {
            status: 'error',
            message,
        });
    }

    private extractMessage(exception: unknown): string {
        if (exception instanceof WsException) {
            return exception.getError() as string;
        }

        // ValidationPipe throws these when class-validator rejects a payload
        if (this.isValidationError(exception)) {
            const response = (exception as any).getResponse?.() ?? (exception as any).response;
            const messages = response?.message;
            return Array.isArray(messages) ? messages.join(', ') : String(messages ?? 'Invalid payload');
        }

        if (exception instanceof Error) {
            return exception.message;
        }

        return 'Unknown error';
    }

    private isValidationError(exception: unknown): boolean {
        return (
            typeof exception === 'object' &&
            exception !== null &&
            'getResponse' in exception
        );
    }
}