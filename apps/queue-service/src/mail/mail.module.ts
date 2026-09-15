// apps/queue-service/src/mail/mail.module.ts
import "dotenv/config"
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailFailure } from './entity/mail-failure-entity';
import { MailService } from './mail.service';
import { MailFailureService } from './mail-failure.service';
import { MailProcessor } from '../processors/mail-processor';

@Module({
    imports: [
        TypeOrmModule.forFeature([MailFailure]),
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {

                const isTest = config.get<string>('nodeEnv') === 'test';
                const smtpConfig = config.get('smtp');

                return {
                    transport: isTest
                        ? { jsonTransport: true }
                        : {
                            host: smtpConfig.host,
                            port: smtpConfig.port,
                            secure: smtpConfig.secure,
                            auth: {
                                user: smtpConfig.user,
                                pass: smtpConfig.pass,
                            },
                        },
                    defaults: {
                        from: smtpConfig.mail_from || 'APP <noreply@example.com>',
                    },
                    template: {
                        dir: join(__dirname, 'mail/template'),
                        adapter: new EjsAdapter(),
                        options: { strict: false },
                    },
                };
            },
        }),
    ],
    providers: [MailService, MailFailureService, MailProcessor],
})
export class MailModule { }