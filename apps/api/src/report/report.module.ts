import { Module } from "@nestjs/common";
import { ReportService } from "./report.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entity/user-entity";
import { MailerModule } from "@nestjs-modules/mailer";
import { MailProducer } from "../mail/mail-producer";
import { BullModule } from "@nestjs/bullmq";


@Module({
    imports: [TypeOrmModule.forFeature([User]), BullModule.registerQueue({
        name: "send-mail"
    })],
    providers: [ReportService, MailProducer]
})

export class ReportModule { }