import { Body, Controller, Post, UseGuards, Req, Get, Param } from '@nestjs/common';
import { UploadService } from './upload.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import type { Request } from 'express';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';


@Controller('uploads')
@UseGuards(JwtGuard)
export class UploadController {
    constructor(private uploadService: UploadService) { }

    @Post('presign')
    @UseGuards(JwtGuard)
    async presign(@Req() req: Request, @Body() dto: PresignUploadDto) {
        const userId = req.user?.id!
        return this.uploadService.createPresignedUpload(userId, dto);
    }

    @Post('confirm')

    @UseGuards(JwtGuard)
    async confirm(@Req() req: Request, @Body() dto: ConfirmUploadDto) {
        const userId = req.user?.id ?? 'temp-user-id';
        return this.uploadService.confirmUpload(userId, dto);
    }

    @Get(':messageId/original')
    @UseGuards(JwtGuard)
    async getOriginalUrl(@Req() req: Request, @Param('messageId') messageId: string) {
        const userId = req.user?.id;
        return this.uploadService.getOriginalUrl(userId!, messageId);
    }
}