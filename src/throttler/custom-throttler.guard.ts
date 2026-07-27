import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";

@Injectable()

export class CustomThrottlerGuard extends ThrottlerGuard {
    private readonly logger = new Logger(CustomThrottlerGuard.name)

    protected async getTracker(req: Record<string, any>): Promise<string> {
        const user = (req as any).user
        if (user?.id) {
            return `user-${user.id}`
        }

        return req.ip ?? 'unknown';
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        try {
            return await super.canActivate(context);

        } catch (error) {

            if (error instanceof ThrottlerException) {
                throw error;
            }

            this.logger.warn(error as Error)
            return true;
        }
    }
}