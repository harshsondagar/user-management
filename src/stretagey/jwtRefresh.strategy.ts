import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserService } from "../user/user.service";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from "express";
import { JwtRefreshPayload } from "../types";


@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private readonly configService: ConfigService, private readonly userService: UserService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => (
                    console.log(req?.cookies[this.configService.get<string>('cookie.name')!]),

                    req?.cookies[this.configService.get<string>('cookie.name')!] ?? null
                )]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.refreshSecret')!,
            passReqToCallback: true,
        })
    }



    validate(req: Request, payload: JwtRefreshPayload) {
        console.log('Config cookie name:',);
        const rawToken = req.cookies?.[this.configService.get<string>('cookie.name')!] ?? null
        console.log(rawToken);

        if (!rawToken) {
            throw new UnauthorizedException('Refresh token missing');
        }

        return { ...payload, rawToken }
    }
}