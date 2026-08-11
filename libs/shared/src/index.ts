export * from "./config/redis"
export * from "./type/type"
export * from './shared.module';
export * from './shared.service';
export * from "./logging/winston.config"
export * from "./logging/request.context.middleware.middleware"
export * from './logging/log-context';
export * from "./logging/attach-user-context.interceptor"
export * from "./logging/request.context.middleware.middleware"
export * from "./logging/job-context.util"
export * from './logging/job-context.util';
export * from './logging/cron-context.util';


// One small thing worth tidying: nestContext here is a stringified JSON blob (from GlobalExceptionFilter's old logging pattern), not a clean class name like "RouterExplorer". That's a separate, pre-existing quirk in GlobalExceptionFilter.logException() — it's passing JSON.stringify(logPayload) as what becomes nestContext, which is now redundant since our structured context object already carries requestId/method/path. Worth cleaning up later, but not blocking — flag it and move on for now unless you want to fix it immediately.

// Step 3 confirmed working. On to step 4: job/cron context for queue-service.