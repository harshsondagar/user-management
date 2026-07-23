import { Body, Controller, InternalServerErrorException, Post, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { SuperAdminGuard } from "../common/gaurds/role-gaurds";
import { JwtGuard } from "../auth/gurads/jwt.guard";
import { ApiResponse } from "@nestjs/swagger";
import { ApiResponseDto } from "../common/dto/api-response";
import { SystemService } from "./system.service";


@Controller('admin/system')
export class SuperAdminController {
    constructor(private readonly userService: UserService, private readonly SystemService: SystemService) { }


    @Post("maintenance-mode")
    @UseGuards(JwtGuard, SuperAdminGuard)
    async toggleMaintenanceMode(@Body() Body: { enabled: boolean }) {

        const result = await this.SystemService.toggleMaintaineneceMode(Body.enabled)

        if (!result) {
            throw new InternalServerErrorException("internal server error")
        }

        return new ApiResponseDto({
            success: true
        })
    }

}