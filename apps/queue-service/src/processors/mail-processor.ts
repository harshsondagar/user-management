import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { MailService } from "../mail/mail.service";
import { MailJobName } from "../../../api/src/mail/mail-producer";
import { MailFailureService } from "../../../api/src/dlq/mail-failure.service";


@Processor('send-mail', {
    concurrency: 1,
    lockDuration: 60000,
    stalledInterval: 30000,
    maxStalledCount: 3,
})
export class MailProcessor extends WorkerHost {
    private readonly logger = new Logger(MailProcessor.name)

    constructor(
        private readonly mailService: MailService,
        private readonly mailFailureService: MailFailureService) {
        super()
    }

    async process(job: Job<any, any, MailJobName>): Promise<any> {
        switch (job.name) {

            case MailJobName.VERIFY_EMAIL:
                return this.sendVerificationMail(job)
            case MailJobName.WELCOME:
                return this.sendWelcomeMail(job)
            case MailJobName.PASSWORD_CHANGE_OTP:
                return this.sendPasswordChangeOtpMail(job)
            case MailJobName.WEEKLY_ADMIN_REPORT:
                return this.sendWeeklyAdminReportMail(job)
            default:
                const _exhaustive: never = job.name;
                throw new Error(`Unhandled mail job name: ${_exhaustive}`);
        }
    }

    async sendVerificationMail(job: Job) {
        const { email, firstName, otp } = job.data;
        return this.mailService.sendOtpEmail(email, firstName, otp)
    }
    async sendWelcomeMail(job: Job) {
        const { email, firstName } = job.data;
        return this.mailService.sendWelcomeMail(email, firstName)
    }
    async sendPasswordChangeOtpMail(job: Job) {
        const { email, resetUrl } = job.data;
        return this.mailService.sendPasswordChangeMail(email, resetUrl)
    }
    async sendWeeklyAdminReportMail(job: Job) {
        const { adminEmail, newUsersCount, reportData } = job.data;
        return this.mailService.sendReportMail(adminEmail, newUsersCount, reportData)
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(`Mail job ${job.id} (${job.name}) sent successfully`);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job, error: Error) {
        this.logger.error(`Mail job ${job.id} (${job.name}) failed: ${error.message}`);

        const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
        if (!isFinalAttempt) {
            return;
        }

        await this.mailFailureService.record({
            jobName: job.name,
            recipientEmail: job.data.email,
            bullJobId: String(job.id),
            errorMessage: error.message,
            attemptsMade: job.attemptsMade,
            jobData: job.data,
        });
    }
}