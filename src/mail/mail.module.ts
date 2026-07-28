import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';

@Module({
    imports: [MailerModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
            transport: {
                host: config.get('smtp.host'),
                port: config.get('smtp.port'),
                secure: false,
                auth: {
                    user: config.get('smtp.user'),
                    pass: config.get('smtp.pass'),
                }
            }, defaults: {
                from: config.get('smtp.mail_from', "APP <harshsondagar@weetechsolution.com>")
            },
            template: {
                dir: join(__dirname, 'template'),
                adapter: new EjsAdapter(),
                options: { strict: false },
            }
        })
    })],
    providers: [MailService],
    exports: [MailService]
})
export class MailModule { }
