import { HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local"
import { AuthService } from "../auth/auth.service";
import { SystemService } from "../user/system.service";
import { UserService } from "../user/user.service";
import { UserRole } from "@app/shared"
import { AppException } from "../common/exceptions/app.exception";


@Injectable()

export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(private readonly authservice: AuthService, private readonly systemService: SystemService, private readonly userService: UserService) {
        super({ usernameField: 'email' })
    }

    async validate(email: string, password: string) {

        const user = await this.userService.findByEmail(email)

        if (!user || !(await this.authservice.validateCredentials(email, password))) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isEmailVerified) {
            throw new AppException(
                'EMAIL_NOT_VERIFIED',
                'Please verify your email before logging in',
                HttpStatus.FORBIDDEN,
            );
        }

        const isMaintenanceMode = await this.systemService.IsMaintenanceModeActive()

        if (isMaintenanceMode) {
            if (user.role === UserRole.SUPER_ADMIN) {
                return user
            }
            throw new ServiceUnavailableException({
                statusCode: 503,
                message: 'The platform is undergoing maintenance. Only the Main Administrator can log in at this time.',
            });
        }
        return user
    }

}