import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { logContextStore } from './log-context';
import DailyRotateFile from 'winston-daily-rotate-file';

export const contextFormat = winston.format((info) => {
    const context = logContextStore.get();
    info.context = context;
    return info;
});

winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
});
export function getWinstonConfig(serviceName: string) {
    const isProd = true

    const renameNestContext = winston.format((info) => {
        if (info.context && typeof info.context === 'string') {
            info.nestContext = info.context;
        }
        return info;
    });

    const structuredContext = winston.format((info) => {
        info.context = logContextStore.get();
        return info;
    });

    const addServiceMeta = winston.format((info) => {
        info.service = serviceName;
        return info;
    });

    const prodFormat = winston.format.combine(
        renameNestContext(),
        structuredContext(),
        addServiceMeta(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    );

    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: isProd
                ? prodFormat
                : winston.format.combine(
                    winston.format.timestamp({ format: 'HH:mm:ss' }),
                    nestWinstonModuleUtilities.format.nestLike(serviceName, { prettyPrint: true }),
                ),
        }),
    ];

    if (isProd) {
        transports.push(
            new DailyRotateFile({
                filename: `logs/${serviceName}-error-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: '20m',
                maxFiles: '14d',
                zippedArchive: true,
                format: prodFormat
            }),
            new DailyRotateFile({
                filename: `logs/${serviceName}-combined-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                zippedArchive: true,
                format: prodFormat
            }),
        );
    }

    return {
        level: isProd ? 'info' : 'debug',
        transports,
    };
}