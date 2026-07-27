import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { User } from '@sentry/node';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name)

    constructor(private readonly mailer: MailerService) { }

    async sendOtpEmail(to: string, name: string, otp: string) {
        try {

            await this.mailer.sendMail({
                to,
                subject: 'Verify your email',
                template: 'verify-otp',
                context: { name, otp, expiresInMinutes: 10 },
            })

        } catch (error) {
            this.logger.warn(`Failed to send OTP email to ${to}: ${(error as Error).message}`)
            throw error;
        }
    }

    async sendWelcomeMail(to: string, name: string) {
        try {
            await this.mailer.sendMail({
                to,
                subject: 'welcome abroad',
                template: 'welcome',
                context: { name },
            })

        } catch (error) {
            this.logger.warn(`Failed to send OTP email to ${to}: ${(error as Error).message}`)
            throw error;
        }
    }

    async sendReportMail(to: string, newUsers: User, templateUsers: {
        firstName: string | undefined;
        email: string;
        formattedDate: string;
    }[]) {
        await this.mailer.sendMail({
            to,
            subject: `Weekly New User Registration Report: ${newUsers.length} New Signups`,
            template: 'report',
            context: {
                totalUsers: newUsers.length,
                users: templateUsers,
            },
        })
    }

}
