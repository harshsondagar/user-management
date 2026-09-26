import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/gurads/jwt.guard";
import { PermissionGuard } from "../../organization/guard/permission.gaurd";
import { RequirePermission } from "../../organization/guard/required.permission.decoretor";
import { CreateContentDto, UpdateContentDto } from "../dto/create-content.dto";
import { ContentStatus } from "../entity/conetnt-entity";
import { ContentAdminService } from "../service/content-admin.service";

@Controller('organizations/:organizationId/content')
@UseGuards(JwtGuard)
export class ContentAdminController {
    constructor(private readonly contentAdminService: ContentAdminService) { }

    @Post()
    @UseGuards(PermissionGuard)
    @RequirePermission('content:write')
    create(
        @Param('organizationId') organizationId: string,
        @Body() dto: CreateContentDto,
    ) {
        return this.contentAdminService.create(organizationId, dto);
    }

    @Patch(':contentId')
    @UseGuards(PermissionGuard)
    @RequirePermission('content:write')
    update(
        @Param('organizationId') organizationId: string,
        @Param('contentId') contentId: string,
        @Body() dto: UpdateContentDto,
    ) {
        return this.contentAdminService.update(organizationId, contentId, dto);
    }

    @Post(':contentId/publish')
    @UseGuards(PermissionGuard)
    @RequirePermission('content:publish')
    publish(
        @Param('organizationId') organizationId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.contentAdminService.setStatus(organizationId, contentId, ContentStatus.PUBLISHED);
    }

    @Post(':contentId/archive')
    @UseGuards(PermissionGuard)
    @RequirePermission('content:publish')
    archive(
        @Param('organizationId') organizationId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.contentAdminService.setStatus(organizationId, contentId, ContentStatus.ARCHIVED);
    }
}