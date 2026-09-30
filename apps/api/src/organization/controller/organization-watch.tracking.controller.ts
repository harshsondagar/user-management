import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // or your existing auth guard
import { WatchTrackingService } from '../service/organization-watchtracking.service';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import type { Request } from 'express';
import { IsNumber, IsString } from 'class-validator';

class RecordProgressDto {
    @IsString()
    contentId!: string;
    @IsNumber()
    deltaSeconds!: number;
}

@Controller('watch')
export class WatchTrackingController {
    constructor(private readonly watchTrackingService: WatchTrackingService) { }

    @UseGuards(JwtGuard)
    @Post('progress')
    async recordProgress(@Req() req: Request, @Body() dto: RecordProgressDto) {
        const userId = req.user?.id;

        if (dto.deltaSeconds <= 0 || dto.deltaSeconds > 300) {
            return { recorded: false, reason: 'deltaSeconds out of expected range' };
        }

        await this.watchTrackingService.recordProgress(userId!, dto.contentId, dto.deltaSeconds);
        return { recorded: true };
    }
}