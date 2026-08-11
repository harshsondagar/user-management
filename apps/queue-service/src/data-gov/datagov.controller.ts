import { Controller, Get, Param, Query } from "@nestjs/common";
import { DatagovCatalogService } from "./datagov-catalog.service";
import { DatagovResourceService } from "./datagov-resource.service";

@Controller('data-gov')
export class DatagovDebugController {
    constructor(
        private readonly catalog: DatagovCatalogService,
        private readonly resource: DatagovResourceService,
    ) { }

    @Get('search')
    async search(@Query('q') q = '', @Query('offset') offset = '0', @Query('limit') limit = '8') {
        return this.catalog.search(q, Number(offset), Number(limit));
    }

    @Get('lookup/:nid')
    async lookup(@Param('nid') nid: string) {
        const resourceIds = await this.resource.lookupResourceIds(nid);
        return { nid, resourceIds };
    }

    @Get('resource/:resourceId')
    async getResource(
        @Param('resourceId') resourceId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.resource.fetchResource({
            resourceId,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }
}