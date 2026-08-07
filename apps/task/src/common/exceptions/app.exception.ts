import { HttpException, HttpStatus } from "@nestjs/common";
import { metadata } from "reflect-metadata/no-conflict";


export class AppException extends HttpException {
    constructor(
        public readonly errorCode: string,
        message: string,
        status = HttpStatus.BAD_REQUEST,
        public readonly metaData?: Record<string, unknown>
    ) {
        super({ errorCode, message, metadata }, status)
    }
}


export class ResourceNotFoundException extends AppException {
    constructor(resource: string, id: string | number) {
        super(
            'RESOURCE_NOT_FOUND',
            `${resource} with id ${id} not found`,
            HttpStatus.NOT_FOUND,
            { resource, id },
        );
    }
}

export class InsufficientPermissionsException extends AppException {
    constructor(action: string) {
        super(
            'INSUFFICIENT_PERMISSIONS',
            `You do not have permission to perform: ${action}`,
            HttpStatus.FORBIDDEN,
        );
    }
}

// src/common/exceptions/app.exception.ts

export class MaintenanceModeException extends AppException {
    constructor(estimatedDuration?: string) {
        super(
            'SERVICE_UNAVAILABLE_MAINTENANCE',
            'The system is currently undergoing scheduled maintenance. Please check back later.',
            HttpStatus.SERVICE_UNAVAILABLE,
            estimatedDuration ? { estimatedDuration } : undefined,
        );
    }
}