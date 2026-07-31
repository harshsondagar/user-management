import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { off } from 'process';
import { firstValueFrom } from 'rxjs';

export interface CatalogEntry {
    nid: number;
    catalogUuid: string;
    title: string;
    url: string;
    description?: string;
    ministry?: string;
    sector?: string;
    jurisdiction?: string;
    govtType?: string;
    publishedDate?: Date;
    keywords?: string[];
    isWebservice: boolean; // signal only — not a guarantee of a live resource
}

export interface CatalogPage {
    total: number;
    entries: CatalogEntry[];
}

@Injectable()
export class DatagovCatalogService {

    private readonly logger = new Logger(DatagovCatalogService.name);
    private readonly baseUrl: string;
    private readonly portalUrl = 'https://data.gov.in';

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService
    ) {
        this.baseUrl = this.config.get<string>('dataGovIn.portalBackendUrl')!;
    }

    async search(query: string, offset = 0, limit = 8, sector?: string) {


        const { data } = await firstValueFrom(
            this.http.get(`${this.baseUrl}/catalogs`, {
                params: {
                    offset,
                    limit,
                    'sort[published_date]': 'desc',
                    search_api_fulltext: query,
                    'filters[field_sector:name]': sector,
                },
                headers: this.headers(),
            })
        )


        const rows = data?.data?.rows ?? [];

        if (typeof data?.total !== 'number') {
            throw new Error(`Catalog search returned invalid total at offset ${offset}`);
        }

        return {
            total: data.total,
            entries: rows.map((row: any) => this.mapRow(row)),
        };
    }

    async *iterateAll(query = '', pageSize = 100): AsyncGenerator<CatalogEntry> {
        let offset = 0
        let total = Infinity

        while (offset < total) {
            const page = await this.search(query, offset, pageSize)
            total = page.total

            for (const entry of page.entries) {
                yield entry
            }
            offset += pageSize
        }
    }

    private mapRow(row: any): CatalogEntry {
        const first = (field: any) => (Array.isArray(field) ? field[0] : field);

        return {
            nid: Number(first(row.nid)),
            catalogUuid: first(row.uuid),
            title: first(row.title),
            url: `${this.portalUrl}${first(row.node_alias)
                }`,
            description: first(row['body:value']),
            ministry: first(row['field_ministry_department:name']),
            sector: first(row['field_sector:name']),
            jurisdiction: first(row['field_asset_jurisdiction:name']),
            govtType: first(row.govt_type),
            publishedDate: row.published_date ? new Date(first(row.published_date) * 1000) : undefined,
            keywords: row.keywords ?? [],
            isWebservice: first(row.is_webservice) === 1,
        };
    }

    private headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (compatible; MyDataApp/1.0)',
            Accept: 'application/json', // ← the /catalogs endpoint wants this, even though it returns JSON
        };
    }



    // async lookupResourceIds(nid: string | number): Promise<string[]> {
    //     const url = `https://www.data.gov.in/backend/dmspublic/v1/resources`

    //     const { data } = await firstValueFrom(
    //         this.http.get(url, {
    //             params: {
    //                 _format: 'json',
    //                 'filters[catalog_reference]': nid,
    //                 offset: 0,
    //                 limit: 8,
    //                 'sort[changed]': 'desc',
    //                 'filters[domain_visibility]': 4,
    //             },
    //             headers: {
    //                 'User-Agent': 'Mozilla/5.0 (compatible; MyDataApp/1.0)',
    //                 Accept: 'application/json',
    //             },
    //         }),
    //     );

    //     this.logger.debug(`Raw web-services response: ${JSON.stringify(data, null, 2)}`);

    //     const rows = data?.data?.rows ?? [];
    //     this.logger.debug(`Rows found: ${rows.length}`);
    //     const ids: string[] = [];
    //     for (const row of rows) {
    //         const raw = Array.isArray(row.uuid) ? row.uuid[0] : row.uuid;
    //         if (!raw) continue;
    //         const clean = raw.includes('~') ? raw.split('~')[1] : raw; // strip "200~" prefix
    //         ids.push(clean);
    //     }

    //     return Array.from(new Set(ids));
    // }

    // private defaultHeaders() {
    //     return {
    //         'User-Agent':
    //             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    //         Accept:
    //             'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //         'Accept-Language': 'en-US,en;q=0.9',
    //         'Accept-Encoding': 'gzip, deflate, br',
    //         Referer: 'https://data.gov.in/',
    //         Connection: 'keep-alive',
    //     };
    // }

    // private sleep(ms: number) {
    //     return new Promise((resolve) => setTimeout(resolve, ms));
    // }
}


