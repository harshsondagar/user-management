import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { HlsService } from './hls.service';
import { Public } from '../common/decorator/public-decoretor';
import { HlsTokenGuard } from './hls-token.guard';

const QUALITIES = ['360p', '720p', '1080p'];

@UseGuards(HlsTokenGuard)
@Controller('stream')
export class StreamController {

    @Get(':videoId/master.m3u8')
    @Public()
    master(@Param('videoId') videoId: string, @Res() res: Response) {
        return this.send(res, videoId, 'master.m3u8');
    }

    @Get(':videoId/:quality/:file')
    @Public()
    rendition(
        @Param('videoId') videoId: string,
        @Param('quality') quality: string,
        @Param('file') file: string,
        @Res() res: Response,
    ) {
        if (!QUALITIES.includes(quality)) throw new NotFoundException();
        return this.send(res, videoId, join(quality, file), file);
    }

    private send(res: Response, videoId: string, relPath: string, fileName = relPath) {
        const validId = /^[0-9a-f-]{36}$/i.test(videoId);
        const validFile = /^(master\.m3u8|index\.m3u8|seg_\d{3,}\.ts)$/.test(fileName);
        if (!validId || !validFile) throw new NotFoundException();

        const filePath = join(HlsService.HLS_DIR, videoId, relPath);
        if (!existsSync(filePath)) throw new NotFoundException();

        if (fileName.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache');
        } else {
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
        }
        res.sendFile(filePath);
    }
}