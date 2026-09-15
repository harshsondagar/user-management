import { Module } from '@nestjs/common';
import { OtpService } from './opt.service';

@Module({ exports: [OtpService], providers: [OtpService,] })

export class OtpModule {

}
