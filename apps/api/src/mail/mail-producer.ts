import { MailJobName } from "@app/shared";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";


@Injectable()
export class MailProducer {
    constructor(@InjectQueue('send-mail') private readonly queue: Queue) { }

    private readonly defaultOpts = {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
    };

    async addVerificationMailJob(email: string, firstName: string, otp: string) {
        return this.queue.add(MailJobName.VERIFY_EMAIL, { email, firstName, otp }, this.defaultOpts)
    }
    async addWelcomeMailJob(email: string, firstName: string) {
        return this.queue.add(MailJobName.WELCOME, { email, firstName }, this.defaultOpts)
    }
    async addForgotPasswordMailJob(email: string, resetUrl: string) {
        return this.queue.add(MailJobName.PASSWORD_CHANGE_OTP, { email, resetUrl }, this.defaultOpts)
    }
    async addWeeklyAdminReportMailJob(adminEmail: string, newUsersCount: number, reportData?: any) {
        return this.queue.add(MailJobName.WEEKLY_ADMIN_REPORT, { adminEmail, newUsersCount, reportData }, this.defaultOpts)
    }
}