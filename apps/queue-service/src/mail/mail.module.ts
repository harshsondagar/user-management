// apps/queue-service/src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailFailure } from '@app/shared';
import { MailService } from './mail.service';
import { MailFailureService } from '../../../api/src/dlq/mail-failure.service';
import { MailProcessor } from '../processors/mail-processor';

@Module({
    imports: [
        TypeOrmModule.forFeature([MailFailure]),
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: () => ({
                transport: {
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                },
                defaults: {
                    from: process.env.MAIL_FROM || 'APP <noreply@example.com>',
                },
                template: {
                    dir: join(__dirname, 'mail/template'),
                    adapter: new EjsAdapter(),
                    options: { strict: false },
                },
            }),
        }),
    ],
    providers: [MailService, MailFailureService, MailProcessor],
})
export class MailModule { }