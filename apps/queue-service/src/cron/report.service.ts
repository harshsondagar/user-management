import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/shared';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from "@nestjs/schedule";
import { MailJobName, MailProducer } from '../../../api/src/mail/mail-producer';
import { MailFailureService } from '../../../api/src/dlq/mail-failure.service';

@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly mailProducer: MailProducer,
        private readonly mailFailureService: MailFailureService,
    ) { }

    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyAdminEmail() {
        this.logger.log('Starting weekly registration report job...');
        try {
            await this.generateAndQueueReport();
        } catch (error) {
            this.logger.error('Failed to execute weekly report cron job', (error as Error).stack);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async checkLastReportSucceeded() {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const failed = await this.mailFailureService.findRecentByJobName(
            MailJobName.WEEKLY_ADMIN_REPORT,
            lastWeekStart,
        );

        if (failed.length > 0) {
            this.logger.warn(`Weekly report failed ${failed.length} time(s) last cycle — retrying`);
            try {
                await this.generateAndQueueReport();
            } catch (error) {
                this.logger.error('Failed to retry weekly report', (error as Error).stack);
            }
        }
    }

    private async generateAndQueueReport(): Promise<void> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newUsers = await this.userRepository.find({
            where: { createdAt: MoreThanOrEqual(sevenDaysAgo) },
            select: ['email', 'firstName', 'createdAt'],
            order: { createdAt: 'ASC' },
        });

        if (newUsers.length === 0) {
            this.logger.log('No new users registered this week. Skipping email.');
            return;
        }

        const templateUsers = newUsers.map((user) => ({
            firstName: user.firstName,
            email: user.email,
            formattedDate: user.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        }));

        const adminEmails = process.env.SUPER_ADMIN_EMAIL!;

        await this.mailProducer.addWeeklyAdminReportMailJob(adminEmails, newUsers.length, templateUsers);
    }
}