import { Controller, Get, Param, Query } from "@nestjs/common";
import { DatagovCatalogService } from "../  datagov-catalog.service";
import { Public } from "../../common/decorator/public-decoretor";
import { DatagovResourceService } from "../datagov-resource.service";


@Controller('data-gov')
export class DatagovScraperController {
    constructor(
        private readonly catalog: DatagovCatalogService,
        private readonly resource: DatagovResourceService
    ) { }

    @Public()
    @Get('search')
    async search(@Query('q') q = '', @Query('offset') offset = '0', @Query('limit') limit = '8') {
        console.log(q);

        return this.catalog.search(q, Number(offset), Number(limit));
    }

    @Public()
    @Get('lookup/:nid')
    async lookup(@Param('nid') nid: string) {
        const resourceIds = await this.resource.lookupResourceIds(nid);
        return { nid, resourceIds };
    }

    @Public()
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