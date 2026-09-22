import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { RolesService } from '../service/organization-role.service';
import { RequirePermission } from '../guard/required.permission.decoretor';
import { PermissionGuard } from '../guard/permission.gaurd';
import { PERMISSIONS } from '../service/constant';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { CreateRoleDto } from '../dto/create-role.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('organizations/:organizationId/roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    list(@Param('organizationId') organizationId: string) {
        return this.rolesService.listForOrganization(organizationId);
    }

    @Post()
    @RequirePermission(PERMISSIONS.ORG_MANAGE_ROLES)
    create(@Param('organizationId') organizationId: string, @Body() dto: CreateRoleDto) {
        return this.rolesService.create(organizationId, dto.roleName, dto.description, dto.permissionKeys);
    }

    @Patch(':roleId')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_ROLES)
    update(
        @Param('organizationId') organizationId: string,
        @Param('roleId') roleId: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.rolesService.update(organizationId, roleId, dto);
    }

    @Delete(':roleId')
    @RequirePermission(PERMISSIONS.ORG_MANAGE_ROLES)
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(@Param('organizationId') organizationId: string, @Param('roleId') roleId: string) {
        return this.rolesService.delete(organizationId, roleId);
    }
}