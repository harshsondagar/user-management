import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class HlsTokenGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest();
        const auth: string | undefined = req.headers.authorization;
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
        if (!token) throw new UnauthorizedException('Missing token');

        try {
            const payload = await this.jwt.verifyAsync<{ vid: string }>(token);
            // token must belong to the video being requested
            if (payload.vid !== req.params.videoId) throw new Error('wrong video');
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
        return true;
    }
}