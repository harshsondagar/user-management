import { Controller, Get, Param, Query } from '@nestjs/common';
import { DatagovScraperService } from './datagov-scraper.service';
import { Public } from '../common/decorator/public-decoretor';
import { ScraperService } from '../scraper/scraper.service';

@Controller('data-gov')
export class DatagovScraperController {
    constructor(
        private readonly dataGovService: DatagovScraperService,
        private readonly scraperService: ScraperService
    ) { }

    @Public()
    @Get('resource/:resourceId')
    async getResource(
        @Param('resourceId') resourceId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.dataGovService.fetchResource({
            resourceId,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }

    @Public()
    @Get('lookup/:nid')
    async lookupResource(@Param('nid') nid: string) {
        const resourceIds = await this.dataGovService.lookupResourceIds(nid);
        return { nid, resourceIds };
    }


    @Public()
    @Get('search')
    async search(@Query('q') q: string) {
        const results = await this.scraperService.searchCatalog(q || 'census');
        return results;
    }
}
