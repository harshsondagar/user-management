import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { off } from 'process';
import { firstValueFrom } from 'rxjs';

export interface CatalogEntry {
    nid: number;
    catalogUuid: string;
    title: string;
    resourceId: string;
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
            this.http.get(`${this.baseUrl}/search`, {
                params: {
                    query,
                    offset,
                    limit,
                    'notfilters[domain]': 'smartcities.data.gov.in',
                    'filters[type]': 'resources',
                    'filters[domain_visibility]': 4,
                    'sort[_score]': 'desc',
                    ...(sector && { 'filters[field_sector:name]': sector }),
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
        const stripHtml = (s: string) => s?.replace(/<[^>]+>/g, '');

        const sectorTags = row.sector ?? [];
        const titleWords = stripHtml(first(row.title))
            ?.toLowerCase()
            .split(/[\s,]+/)
            .filter((w: string) => w.length > 3) ?? [];

        return {
            nid: Number(first(row.nid)),
            resourceId: first(row.uuid),
            catalogUuid: first(row.uuid),
            title: stripHtml(first(row.title)),
            url: first(row.datafile) ?? `${this.portalUrl}${first(row.node_alias)}`,
            description: undefined, // /search rows don't include a description field
            ministry: first(row.catalog_resource_ministry),
            sector: first(row.sector),
            jurisdiction: undefined, // not present in /search rows
            govtType: undefined,     // not present in /search rows
            publishedDate: row.created ? new Date(first(row.created) * 1000) : undefined,
            keywords: Array.from(new Set([...sectorTags, ...titleWords])),
            isWebservice: first(row.is_api_available) === '1',
        };
    }

    private headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (compatible; MyDataApp/1.0)',
            Accept: 'application/json', // ← the /catalogs endpoint wants this, even though it returns JSON
        };
    }


}


