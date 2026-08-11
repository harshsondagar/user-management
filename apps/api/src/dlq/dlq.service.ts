import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// interface RecordResourceFailureParams {
//     resourceId: string;
//     nid: number;
//     title: string;
//     query: string;
//     errorMessage: string;
//     rawContext?: Record<string, any>;
// }

// interface RecordJobFailureParams {
//     bullJobId: string;
//     userId?: string;
//     query: string;
//     errorMessage: string;
//     errorStack?: string;
//     rawContext?: Record<string, any>;
// }

@Injectable()
export class DlqService {
    private readonly logger = new Logger(DlqService.name);

    private readonly baseUrl: string;
    private readonly secret: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.baseUrl = this.config.get<string>('queue_service.url')!;
        this.secret = this.config.get<string>('internal.secrete')!;


    }

    private headers() {
        return { 'x-internal-secret': this.secret };
    }

    async findEntries(params: { scope?: string; status?: string; page: number; pageSize: number }) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.baseUrl}/internal/dlq/entries`, { params, headers: this.headers() }),
        );
        return data;
    }

    async findById(id: string) {
        try {
            const { data } = await firstValueFrom(
                this.http.get(`${this.baseUrl}/internal/dlq/entries/${id}`, { headers: this.headers() }),
            );
            return data;
        } catch (err: any) {
            if (err.response?.status === 404) {
                throw new HttpException('DLQ entry not found', HttpStatus.NOT_FOUND);
            }
            throw err;
        }
    }

    async getStats() {
        const { data } = await firstValueFrom(
            this.http.get(`${this.baseUrl}/internal/dlq/stats`, { headers: this.headers() }),
        );
        return data;
    }

    async markResolved(id: string, adminId: string) {
        const { data } = await firstValueFrom(
            this.http.post(`${this.baseUrl}/internal/dlq/entries/${id}/resolve`, null, {
                params: { adminId },
                headers: this.headers(),
            }),
        );
        return data;
    }

    async markIgnored(id: string) {
        const { data } = await firstValueFrom(
            this.http.post(`${this.baseUrl}/internal/dlq/entries/${id}/ignore`, null, { headers: this.headers() }),
        );
        return data;
    }

    async markResolvedBy(id: string, adminUserId: string) {
        const { data } = await firstValueFrom(
            this.http.post(
                `${this.baseUrl}/internal/dlq/entries/${id}/resolve`,
                null,
                { params: { adminId: adminUserId }, headers: this.headers() },
            ),
        );
        return data;
    }

}
