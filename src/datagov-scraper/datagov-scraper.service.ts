import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface ProgressState {
    lastOffset: number;
    processedUuids: string[];
    failedUuids: { uuid: string; error: string }[];
    updatedAt: string;
}

export interface DataGovResourceParams {
    resourceId: string;
    limit?: number;
    offset?: number;
    filters?: Record<string, string>;
    fields?: string[];
}

@Injectable()
export class DatagovScraperService {

    private readonly logger = new Logger(DatagovScraperService.name);
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(private readonly http: HttpService,
        private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>('dataGovIn.apiKey')!;
        this.baseUrl = this.config.get<string>('dataGovIn.baseUrl')!;
    }




    async fetchResource(params: DataGovResourceParams) {
        const { resourceId, limit = 100, offset = 0, filters, fields } = params

        const query: Record<string, string> = {
            'api-key': this.apiKey,
            format: 'json',
            limit: String(limit),
            offset: String(offset),
        }

        if (fields?.length) query.fields = fields.join(',')
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                query[`filters[${key}]`] = value
            }
        }

        const url = `${this.baseUrl}/resource/${resourceId}`;

        try {
            const res = await firstValueFrom(
                this.http.get(url, { params: query })
            )
            return res.data
        } catch (err) {
            console.log(err);

            const axiosErr = err as AxiosError;
            this.logger.error(
                `Failed fetching resource ${resourceId}: ${axiosErr.message}`,
            );
            throw new HttpException(
                `data.gov.in request failed: ${axiosErr.message}`,
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    async fetchAllPages(resourceId: string, pageSize = 500) {
        let offset = 0
        let all: any[] = []

        while (true) {
            const page = await this.fetchResource({
                resourceId,
                limit: pageSize,
                offset,
            });

            const records = page.records ?? [];
            all = all.concat(records);

            if (records.length < pageSize) break;
            offset += pageSize;
            await this.sleep(300);
        }
        return all;
    }

    async lookupResourceIds(nid: string | number): Promise<string[]> {
        const url = `https://www.data.gov.in/backend/dmspublic/v1/resources`

        const { data } = await firstValueFrom(
            this.http.get(url, {
                params: {
                    _format: 'json',
                    'filters[catalog_reference]': nid,
                    offset: 0,
                    limit: 8,
                    'sort[changed]': 'desc',
                    'filters[domain_visibility]': 4,
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; MyDataApp/1.0)',
                    Accept: 'application/json',
                },
            }),
        );

        this.logger.debug(`Raw web-services response: ${JSON.stringify(data, null, 2)}`);

        const rows = data?.data?.rows ?? [];
        this.logger.debug(`Rows found: ${rows.length}`);
        const ids: string[] = [];
        for (const row of rows) {
            const raw = Array.isArray(row.uuid) ? row.uuid[0] : row.uuid;
            if (!raw) continue;
            const clean = raw.includes('~') ? raw.split('~')[1] : raw; // strip "200~" prefix
            ids.push(clean);
        }

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

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}


