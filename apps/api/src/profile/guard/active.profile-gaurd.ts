import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../stretagey/jwt-stratagey';


@Injectable()
export class ActiveProfileGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthenticatedUser | undefined;
        const profileId = request.params?.profileId as string | undefined;

        if (!profileId) {
            // Wiring bug (guard applied to a route with no :profileId), not a
            // legitimate 403 - fail loudly rather than silently passing.
            throw new Error('ActiveProfileGuard requires a :profileId route param');
        }

        if (!user?.activeProfileId || user.activeProfileId !== profileId) {
            throw new ForbiddenException(
                'This profile has not been selected for the current session',
            );
        }

        return true;
    }
}