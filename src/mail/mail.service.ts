import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

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

}
