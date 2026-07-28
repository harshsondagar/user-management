import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";
import * as Sentry from '@sentry/node';

interface ErrorResponse {
    statusCode: number;
    errorCode: string;
    message: string;
    path: string;
    timestamp: string;
    requestId: string;
    details?: unknown;
}
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {

    private readonly logger = new Logger(GlobalExceptionFilter.name)

    catch(exception: unknown, host: ArgumentsHost) {

        const ctx = host.switchToHttp()
        const request = ctx.getRequest<Request>()
        const response = ctx.getResponse<Response>()
        const requestId = (request.headers['x-request-id'] as string) ?? 'unknown'

        const { status, errorCode, message, details } = this.resolveException(exception)

        const errorResponse: ErrorResponse = {
            statusCode: status,
            errorCode,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
            requestId,
            ...(details ? { details } : {}),
        };

        this.logException(exception, errorResponse, request)

        response.status(status).json(errorResponse)
    }

    private resolveException(exception: unknown): {
        status: number;
        errorCode: string;
        message: string;
        details?: unknown;
    } {
        if (exception instanceof HttpException) {

            const res = exception.getResponse()
            const status = exception.getStatus()

            if (typeof res === 'object' && res !== null) {

                const r = res as Record<string, string>

                return {
                    status,
                    errorCode: (r.errorCode as string) ?? this.defaultErrorCode(status),
                    message: this.extractMessage(r),
                    details: r.metaData ?? r.details
                }
            }

            return {
                status,
                errorCode: this.defaultErrorCode(status),
                message: res as string,
            };
        }
        if (exception instanceof QueryFailedError) {
            return {
                status: HttpStatus.CONFLICT,
                errorCode: 'DATABASE_ERROR',
                message: 'A database error occurred while processing your request',
            };
        }

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            errorCode: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        }

    }

    extractMessage(res: Record<string, unknown>): string {
        if (Array.isArray(res.message)) return res.message.join(',  ')

        return (res.message as string) ?? 'Unexpected error';
    }

    private defaultErrorCode(status: number): string {
        const map: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
        };
        return map[status] ?? 'INTERNAL_SERVER_ERROR';
    }


    private logException(exception: unknown, errorResponse: ErrorResponse, request: Request): void {
        const isServerError = errorResponse.statusCode >= 500;


        const logPayload = {
            requestId: errorResponse.requestId,
            method: request.method,
            path: request.url,
            statusCode: errorResponse.statusCode,
            errorCode: errorResponse.errorCode,
            userId: (request as any).user?.id,
        };


        if (isServerError) {
            this.logger.error(
                `${errorResponse.message}`,
                exception instanceof Error ? exception.stack : String(exception),
                JSON.stringify(logPayload),
            );
            Sentry.captureException(exception, {
                tags: { requestId: errorResponse.requestId },
                extra: logPayload,
            });
        } else {
            this.logger.warn(`${errorResponse.message}`, JSON.stringify(logPayload));
        }
    }
}