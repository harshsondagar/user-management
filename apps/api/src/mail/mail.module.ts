import { Module } from '@nestjs/common';
import { MailProducer } from './mail-producer';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
@Module({
    imports: [
        BullModule.registerQueue({ name: 'send-mail' }),
        BullBoardModule.forFeature({ name: 'send-mail', adapter: BullMQAdapter }),
    ],
    providers: [MailProducer],
    exports: [MailProducer],
})
export class MailModule { }