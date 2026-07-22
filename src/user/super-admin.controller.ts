import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { SuperAdminGuard } from "../common/gaurds/role-gaurds";


@Controller('admin/system')
export class SuperAdminController {
    constructor(private readonly userService: UserService) { }


    @Post("maintenance-mode")
    @UseGuards(SuperAdminGuard)
    toggleMaintenanceMode(@Body() Body: { enabled: boolean }) {
        return
    }

}