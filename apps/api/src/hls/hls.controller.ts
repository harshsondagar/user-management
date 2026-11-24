import {
    BadRequestException,
    Controller,
    InternalServerErrorException,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname } from 'path';
import { HlsService } from './hls.service';
import { Public } from '../common/decorator/public-decoretor';

@Controller('hls')
export class HlsController {
    constructor(private readonly hlsService: HlsService) { }

    @Post('upload')
    @Public()
    @UseInterceptors(
        FileInterceptor('video', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    mkdirSync(HlsService.UPLOAD_DIR, { recursive: true });
                    cb(null, HlsService.UPLOAD_DIR);
                },
                filename: (req, file, cb) =>
                    cb(null, `${randomUUID()}${extname(file.originalname)}`),
            }),
            limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
            fileFilter: (req, file, cb) =>
                file.mimetype.startsWith('video/')
                    ? cb(null, true)
                    : cb(new BadRequestException('Only video files are allowed'), false),
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No video file uploaded');

        const videoId = randomUUID(); // server-generated, so no path tricks from users

        try {
            const playlistUrl = await this.hlsService.convertToHls(file.path, videoId);
            return { videoId, playlistUrl };
        } catch (err) {
            throw new InternalServerErrorException('Video conversion failed');
        } finally {
            unlink(file.path).catch(() => undefined); // delete the temp upload
        }
    }
}