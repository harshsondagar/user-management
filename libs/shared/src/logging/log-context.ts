import { AsyncLocalStorage } from 'async_hooks';
import { CronLogContext, HttpLogContext, JobLogContext, SystemLogContext, WsLogContext } from '../type/type';

export type LogContext = HttpLogContext | JobLogContext | CronLogContext | SystemLogContext | WsLogContext;

class LogContextStore {
    private readonly storage = new AsyncLocalStorage<LogContext>();

    run<T>(context: LogContext, fn: () => T): T {
        return this.storage.run(context, fn)
    }

    get(): LogContext {
        return this.storage.getStore() ?? { type: 'system' };
    }
}

export const logContextStore = new LogContextStore();