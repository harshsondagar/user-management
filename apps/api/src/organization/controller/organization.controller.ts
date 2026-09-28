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
import { OrganizationsService } from '../service/organization.service';
import { CreateOrganizationDto } from '../dto/create.organization.dto';
import { UpdateOrganizationDto } from '../dto/update.organization.dto';
import { RequirePermission } from '../guard/required.permission.decoretor';
import { PermissionGuard } from '../guard/permission.gaurd';
import { OrganizationType } from '../entities/organization-entity';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { currentUser } from '../../common/decorator/currentUser-decorator';
import { User } from '../../user/entity/user-entity';
import { PERMISSIONS } from '../service/constant';
import { BillingService } from '../../billing/billing.service';

@UseGuards(JwtGuard)
@Controller('organizations')
export class OrganizationsController {
    constructor(
        private readonly organizationsService: OrganizationsService,
        private readonly billingService: BillingService,

    ) { }

    @Get()
    findAll(@currentUser() user: User) {
        return this.organizationsService.findAllForUser(user.id);
    }

    @Get(':organizationId')
    @UseGuards(PermissionGuard)
    findOne(@currentUser() user: User, @Param('organizationId') organizationId: string) {
        return this.organizationsService.findOneForUser(user.id, organizationId);
    }

    @Post()
    create(@currentUser() user: User, @Body() dto: CreateOrganizationDto) {
        return this.organizationsService.createOrganization(
            user.id,
            dto.organizationName,
            OrganizationType.TEAM,
        );
    }

    @Patch(':organizationId')
    @UseGuards(PermissionGuard)
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    update(
        @Param('organizationId') organizationId: string,
        @Body() dto: UpdateOrganizationDto,
    ) {
        return this.organizationsService.update(organizationId, dto.organizationName!);
    }

    @Delete(':organizationId')
    @UseGuards(PermissionGuard)
    @RequirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS)
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(@Param('organizationId') organizationId: string) {
        return this.organizationsService.delete(organizationId);
    }
}