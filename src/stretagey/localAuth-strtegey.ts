import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local"
import { AuthService } from "../auth/auth.service";
import { SystemService } from "../user/system.service";
import { UserService } from "../user/user.service";
import { UserRole } from "../user/user-entity";


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

        const isMaintenanceMode = await this.systemService.IsMaintenanceModeActive()
        console.log(isMaintenanceMode);

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