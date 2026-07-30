import { Module } from '@nestjs/common';
import { DatagovScraperController } from './datagov-scraper.controller';
import { DatagovScraperService } from './datagov-scraper.service';
import { HttpModule } from "@nestjs/axios"
import { ScraperService } from '../scraper/scraper.service';


@Module({
    imports: [HttpModule],
    providers: [DatagovScraperService, ScraperService],
    controllers: [DatagovScraperController],
    exports: [DatagovScraperService],
})
export class DatagovScraperModule { }
