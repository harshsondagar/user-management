import { logContextStore } from './log-context';
import { CronLogContext } from '../type/type';

export function runWithCronContext<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
    const context: CronLogContext = { type: 'cron', jobName };
    return logContextStore.run(context, fn);
}