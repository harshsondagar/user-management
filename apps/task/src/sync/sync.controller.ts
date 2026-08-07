// sync.controller.ts
import { Controller, Get, HttpException, HttpStatus, Inject, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FullSyncService } from './full-sync.service';
import { Public } from '../common/decorator/public-decoretor';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User, UserRole } from '../user/user-entity';
import { Roles } from '../common/decorator/roles.decorator';
import { ScrapeQuotaService } from './scrape-quota.service';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';


@Controller('sync')
export class SyncController {
    constructor(
        @Inject(FullSyncService) private readonly fullSyncService: FullSyncService,
        @InjectQueue('scrape-gov-data') private readonly syncQueue: Queue,
        private readonly scrapeQuota: ScrapeQuotaService,
        private readonly scrapeProducer: ScrapeProducer
    ) { }

    @UseGuards(JwtGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER)
    @Post('run')
    async run(@currentUser() user: User, @Query('q') q: string) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

        if (!isAdmin) {
            await this.scrapeQuota.checkAndIncrement(user.id, 2);
            if (!q.trim()) {
                throw new HttpException(
                    'q (dataset name) is required for non-admin users.',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        const job = await this.scrapeProducer.triggerScrape(q, user.id)

        return { jobId: job.id, status: 'queued' };
    }

    @Get('status/:jobId')
    async getJobStatus(@Param('jobId') jobId: string) {
        const job = await this.syncQueue.getJob(jobId);

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        const state = await job.getState();

        return {
            jobId: job.id,
            state,
            query: job.data.query,
            progress: job.progress ?? null,
            result: job.returnvalue ?? null,
            failedReason: job.failedReason ?? null,
            attemptsMade: job.attemptsMade,
            createdAt: new Date(job.timestamp).toISOString(),
            processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
            finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        };
    }

    @Get('status')
    async getCurrentStatus() {
        const [active, waiting] = await Promise.all([
            this.syncQueue.getActive(),
            this.syncQueue.getWaiting(),
        ]);

        return {
            activeJobs: await Promise.all(
                active.map(async (job) => ({
                    jobId: job.id,
                    query: job.data.query,
                    progress: job.progress ?? null,
                    startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
                })),
            ),
            queuedJobs: waiting.map((job) => ({
                jobId: job.id,
                query: job.data.query,
            })),
        };
    }


}