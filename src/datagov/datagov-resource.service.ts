import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";




export interface FetchResourceParams {
    resourceId: string;
    limit?: number;
    offset?: number;
    filters?: Record<string, string>;
    fields?: string[];
}

@Injectable()
export class DatagovResourceService {
    private readonly logger = new Logger(DatagovResourceService.name);
    private readonly apiKey: string;
    private readonly resourceApiBaseUrl: string;
    private readonly portalUrl: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.apiKey = this.config.get<string>('dataGovIn.apiKey')!;
        this.resourceApiBaseUrl = this.config.get<string>('dataGovIn.resourceApiBaseUrl')!;
        this.portalUrl = this.config.get<string>('dataGovIn.portalBackendUrl')!;
    }

    async lookupResourceIds(nid: string | number): Promise<string[]> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.portalUrl}/resources`, {
                params: {
                    _format: 'json',
                    'filters[catalog_reference]': nid,
                    'filters[domain_visibility]': 4,
                    offset: 0,
                    limit: 8,
                    'sort[changed]': 'desc'   // ← fixed: "changed" not "changes"
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; MyDataApp/1.0)',
                    Accept: 'application/json',
                },
            })
        )

        const rows = data?.data?.rows ?? []

        return Array.from(
            new Set(
                rows.map((row: any) => {
                    const raw = Array.isArray(row.uuid) ? row.uuid[0] : row.uuid
                    if (!raw) return null
                    return raw.includes('~') ? raw.split('~')[1] : raw
                }).filter(Boolean),
            )
        ) as string[]

    }

    async fetchResource(params: FetchResourceParams, retries = 3) {
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

        try {
            const res = await firstValueFrom(
                this.http.get(`${this.resourceApiBaseUrl}/resource/${resourceId}`, { params: query })
            )
            return res.data
        } catch (err) {
            const axiosErr = err as AxiosError;

            if (axiosErr.response?.status === 429 && retries > 0) {
                const waitMs = 10000; // 10s — be generous, this API's limits seem tight
                this.logger.warn(`Rate limited on ${resourceId}, waiting ${waitMs / 1000}s, ${retries} retries left`);
                await this.sleep(waitMs);
                return this.fetchResource(params, retries - 1);
            }


            this.logger.error(`Failed fetching resource ${resourceId}: ${axiosErr.message}`);
            throw new HttpException(
                `data.gov.in resource request failed: ${axiosErr.message}`,
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
            await this.sleep(2000);
        }
        return all;
    }



    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }


}