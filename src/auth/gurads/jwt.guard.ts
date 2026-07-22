import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { PUBLIC_KEY } from "../../common/decorator/public-decoretor";

@Injectable()

export class JwtGuard extends AuthGuard('jwt') {

    constructor(private readonly reflector: Reflector) {
        super()
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride(PUBLIC_KEY, [context.getHandler(), context.getClass()])

        if (isPublic) {
            return true
        }
        return super.canActivate(context)
    }

}