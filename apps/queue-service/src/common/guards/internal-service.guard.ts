import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";



@Injectable()
export class InternalServiceGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const secret = req.headers['x-internal-secret'];
        const expected = this.config.get('internal.secret');
        console.log(expected);

        if (!expected) {
            throw new UnauthorizedException('Internal service secret not configured');
        }
        if (secret !== expected) {
            throw new UnauthorizedException('Invalid internal service secret');
        }
        return true;
    }
}