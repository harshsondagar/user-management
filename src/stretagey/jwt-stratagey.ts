import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserService } from "../user/user.service";
import { ExtractJwt, Strategy } from "passport-jwt"
import { JwtAccessPayload } from "../types";
import { retry } from "rxjs";
import { User } from "../user/user-entity";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.accessSecret')!,
            algorithms: ['RS256']
        })
    }

    async validate(payload: JwtAccessPayload): Promise<User> {
        const user = await this.userService.findById(payload.sub)

        if (!user) {
            throw new UnauthorizedException("user no longer Exist")
        }

        if (user.tokenVersion !== payload.tokenVersion) {
            throw new UnauthorizedException("session is been invalidated")
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new UnauthorizedException("Account is temporarily block")
        }

        return user
    }
}