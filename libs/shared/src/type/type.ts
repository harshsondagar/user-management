export enum MailJobName {
    VERIFY_EMAIL = 'send-email-verification-mail',
    WELCOME = 'send-welcome-mail',
    PASSWORD_CHANGE_OTP = 'send-password-change-otp-mail',
    WEEKLY_ADMIN_REPORT = 'send-weekly-admin-report-mail',
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = "super_admin"
}

export enum FailureScope {
    RESOURCE = 'resource',
    JOB = 'job',
    SEARCH = 'search',
}

export enum DlqStatus {
    PENDING_RETRY = 'pending_retry',
    PERMANENTLY_FAILED = 'permanently_failed',
    RESOLVED = 'resolved',
    IGNORED = 'ignored',
}

export interface HttpLogContext {
    type: 'http';
    requestId: string;
    method: string;
    path: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
}

export interface JobLogContext {
    type: 'job';
    jobId: string;
    jobName: string;
    queue: string;
    attemptsMade?: number;
    finishedAt: string
}

export interface CronLogContext {
    type: 'cron';
    jobName: string;
}

export interface SystemLogContext {
    type: 'system';
}