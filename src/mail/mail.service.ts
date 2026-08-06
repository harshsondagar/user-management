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
                template: 'send-email-verification-mail',
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
                template: 'send-welcome-mail',
                context: { name },
            })

        } catch (error) {
            this.logger.warn(`Failed to send OTP email to ${to}: ${(error as Error).message}`)
            throw error;
        }
    }

    async sendReportMail(to: string, newUsersCount: number, reportData: { firstName?: string; email: string; formattedDate: string }[]) {
        try {

            await this.mailer.sendMail({
                to,
                subject: `Weekly New User Registration Report: ${newUsersCount} New Signups`,
                template: 'send-weekly-admin-report-mail',
                context: {
                    totalUsers: newUsersCount,
                    users: reportData,
                },
            });

        } catch (error) {
            this.logger.warn(`Failed to send Report email to ${to}: ${(error as Error).message}`)
            throw error;
        }
    }

    async sendPasswordChangeMail(to: string, resetUrl: string) {
        try {

            await this.mailer.sendMail({
                to,
                subject: `change forgot password`,
                template: 'send-password-change-otp-mail',
                context: {
                    message: 'click url below to change password',
                    resetUrl
                },
            })

        } catch (error) {
            this.logger.warn(`Failed to send PasswordChange email to ${to}: ${(error as Error).message}`)
            throw error;
        }
    }


}
