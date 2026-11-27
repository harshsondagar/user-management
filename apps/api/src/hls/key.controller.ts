import {
    Controller, Get, Headers, NotFoundException,
    Param, Res, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { HlsService } from './hls.service';
import { Public } from '../common/decorator/public-decoretor';

@Controller('keys')
export class KeyController {
    constructor(private readonly jwt: JwtService) { }

    @Get(':videoId')
    @Public()
    async getKey(
        @Param('videoId') videoId: string,
        @Headers('authorization') auth: string | undefined,
        @Res() res: Response,
    ) {
        if (!/^[0-9a-f-]{36}$/i.test(videoId)) throw new NotFoundException();

        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
        if (!token) throw new UnauthorizedException('Missing token');

        try {
            const payload = await this.jwt.verifyAsync<{ vid: string }>(token);
            if (payload.vid !== videoId) throw new Error('wrong video');
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        let key: Buffer;
        try {
            key = await readFile(join(HlsService.KEY_DIR, videoId, 'enc.key'));
        } catch {
            throw new NotFoundException();
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.send(key); // raw 16 bytes, NOT wrapped in { success, data }
    }
}