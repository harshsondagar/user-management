import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MailFailureService {


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

    async findAll(params: { jobName?: string; page: number; pageSize: number }) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.baseUrl}/internal/mail-failures`, { params, headers: this.headers() }),
        );
        return data;
    }

    async getStats() {
        const { data } = await firstValueFrom(
            this.http.get(`${this.baseUrl}/internal/mail-failures/stats`, { headers: this.headers() }),
        );
        return data;
    }
}