import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { logContextStore } from './log-context';
import DailyRotateFile from 'winston-daily-rotate-file';


export function getWinstonConfig(serviceName: string) {
    const isProd = process.env.NODE_ENV === 'production';

    const NEST_INTERNAL_CONTEXTS = new Set([
        'NestFactory',
        'InstanceLoader',
        'RoutesResolver',
        'RouterExplorer',
        'NestApplication',
    ]);

    const skipNestBootstrapNoise = winston.format((info) => {
        if (
            info.level === 'info' &&
            typeof info.nestContext === 'string' &&
            NEST_INTERNAL_CONTEXTS.has(info.nestContext)
        ) {
            return false;
        }
        return info;
    });

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

    const fullFormat = winston.format.combine(
        renameNestContext(),
        structuredContext(),
        addServiceMeta(),
        winston.format.timestamp(),
        winston.format.colorize({ all: true }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    );

    const combinedFileFormat = winston.format.combine(
        renameNestContext(),
        skipNestBootstrapNoise(),
        structuredContext(),
        addServiceMeta(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    );

    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: isProd
                ? fullFormat // console always shows everything, including bootstrap — useful for live debugging/Docker logs
                : winston.format.combine(
                    winston.format.timestamp({ format: 'HH:mm:ss' }),
                    winston.format.colorize({ all: true }),
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
                zippedArchive: false,
                format: fullFormat, // error file: never filter, always show everything at error level
            }),
            new DailyRotateFile({
                filename: `logs/${serviceName}-combined-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                zippedArchive: false,
                format: combinedFileFormat, // combined file: filtered, operational-focus only
            }),
        );
    }

    return {
        level: isProd ? 'info' : 'debug',
        transports,
    };
}