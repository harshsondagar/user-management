// sync.controller.ts
import { Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { ScrapeProducer } from '../scrap-module/scrape.producer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntitlementGuard, RequireEntitlement } from '../billing/entitlement/entitlement.guard';
import type { Request } from 'express';
import { EntitlementService } from '../billing/entitlement/entitlement.service';
import { UserRole } from '@app/shared';
import { RolesGuard } from '../common/gaurds/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';


@Controller('sync')
export class SyncController {
    constructor(
        @InjectQueue('scrape-gov-data') private readonly syncQueue: Queue,
        private readonly scrapeProducer: ScrapeProducer,
        private readonly entitlementService: EntitlementService,
    ) { }

    @UseGuards(JwtGuard, EntitlementGuard)
    @RequireEntitlement('scrape_requests')
    @Post('run')
    async run(@Req() req: Request, @currentUser() user: User, @Query('q') q: string) {
        try {
            const job = await this.scrapeProducer.triggerScrape(q, user.id)

            return { jobId: job.id, status: 'queued' };
        } catch (err) {
            const entitlement = (req as any).entitlement;
            if (entitlement?.redisKey) {
                await this.entitlementService.release(entitlement.redisKey);
            }
            throw new HttpException('Failed to queue scrape job, please retry.', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    @Get('status/:jobId')
    async getJobStatus(@Param('jobId') jobId: string, @currentUser() user: User) {
        const job = await this.syncQueue.getJob(jobId);

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        if (job.data.userId !== user.id && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
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
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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