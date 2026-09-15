import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { User } from "../user/entity/user-entity";
import { MailProducer } from "../mail/mail-producer";


@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly mailProducer: MailProducer

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