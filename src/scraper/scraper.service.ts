import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import * as cheerio from "cheerio"


export interface CatalogEntry {
    title: string;
    uuid: string;
    url: string;
    description?: string;
    organization?: string;
    sector?: string;
    jurisdiction?: string;
    govtType?: string;
    publishedDate?: Date;
    keywords?: string[];
    hasApi: boolean;
}

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name)
    private readonly baseUrl = 'https://data.gov.in'

    constructor(private readonly http: HttpService) { }

    async searchCatalog(query: string, offset = 0, limit = 8) {
        const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs`;

        const { data } = await firstValueFrom(
            this.http.get(url, {
                params: {
                    offset,
                    limit,
                    'sort[published_date]': 'desc',
                    search_api_fulltext: query,
                },
                headers: this.defaultHeaders(),
            }),
        );
        const rows = data?.data?.rows ?? [];

        return {
            total: data.total,
            entries: rows.map((row: any) => this.mapRow(row)),
        };
    }


    private mapRow(row: any): CatalogEntry {
        const first = (field: any) => (Array.isArray(field) ? field[0] : field);

        return {
            title: first(row.title),
            uuid: first(row.uuid),
            url: `${this.baseUrl}${first(row.node_alias)}`,
            description: first(row['body:value']),
            organization: first(row['field_ministry_department:name']),
            sector: first(row['field_sector:name']),
            jurisdiction: first(row['field_asset_jurisdiction:name']),
            govtType: first(row.govt_type),
            publishedDate: row.published_date ? new Date(first(row.published_date) * 1000) : undefined,
            keywords: row.keywords ?? [],
            hasApi: first(row.is_webservice) === 1,
        };
    }

    async getDatasetPage(datasetUrl: string) {
        const { data: html } = await firstValueFrom(
            this.http.get(datasetUrl, { headers: this.defaultHeaders() }),
        )

        const $ = cheerio.load(html)

        return {
            title: $('h1').first().text().trim(),
            description: $('.field-description, .dataset-description').text().trim(),
            resourceIds: this.extractResourceIds(html),
        };
    }

    private extractResourceIds(html: string): string[] {
        const matches = html.match(
            /resource\/([0-9a-f-]{36})/gi,
        );
        if (!matches) return [];
        const ids = matches.map((m) => m.split('/')[1]);
        return Array.from(new Set(ids));
    }

    private defaultHeaders() {
        return {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Referer: 'https://data.gov.in/',
            Connection: 'keep-alive',
        };
    }

}