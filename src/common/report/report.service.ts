import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../../user/user-entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from "@nestjs/schedule"
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from '../../mail/mail.service';
@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name)

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly mailService: MailService
    ) { }

    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyAdminEmail() {
        this.logger.log('Starting weekly registration report job...');

        const savenDaysAgo = new Date()
        savenDaysAgo.setDate(savenDaysAgo.getDate() - 7)

        try {
            const newUsers = await this.userRepository.find({
                where: {
                    createdAt: MoreThanOrEqual(savenDaysAgo)
                },
                select: ['email', 'firstName', 'createdAt'], order: {
                    createdAt: 'ASC'
                }
            })

            if (newUsers.length === 0) {
                this.logger.log('No new users registered this week. Skipping email.');
                return;
            }
            const templateUsers = newUsers.map(user => ({
                firstName: user.firstName,
                email: user.email,
                formattedDate: user.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                }),
            }));

            // find all admin and send mail to every admin
            // const admins = await this.userRepository.find({
            //     where: [
            //         { role: UserRole.ADMIN },
            //         { role: UserRole.SUPER_ADMIN },
            //         { isAdmin: true }
            //     ],
            //     select: ['email']
            // });

            const adminEmails = process.env.SUPER_ADMIN_EMAIL!

            await this.mailService.sendReportMail(adminEmails, newUsers, templateUsers)

        } catch (error) {
            this.logger.error('Failed to execute weekly report cron job', (error as Error).stack);
        }

    }


}
