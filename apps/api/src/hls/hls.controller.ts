import {
    BadRequestException,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { HlsService } from './hls.service';
import { HLS_QUEUE, HlsJobData } from './hls.constants';
import { Public } from '../common/decorator/public-decoretor';
import { JwtService } from '@nestjs/jwt';


@Controller('hls')
export class HlsController {
    constructor(
        @InjectQueue(HLS_QUEUE) private readonly queue: Queue<HlsJobData>,
        private readonly jwt: JwtService,
    ) { }

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
            limits: { fileSize: 500 * 1024 * 1024 },
            fileFilter: (req, file, cb) =>
                file.mimetype.startsWith('video/')
                    ? cb(null, true)
                    : cb(new BadRequestException('Only video files are allowed'), false),
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No video file uploaded');

        const videoId = randomUUID();

        try {
            await this.queue.add(
                'convert',
                { inputPath: file.path, videoId },
                {
                    jobId: videoId,
                    attempts: 2,
                    backoff: { type: 'fixed', delay: 5000 },
                    removeOnComplete: { age: 3600 },  // keep job info 1 hour
                    removeOnFail: { age: 86400 },     // keep failed jobs 1 day
                },
            );
        } catch (err) {
            await unlink(file.path).catch(() => undefined); // Redis down, clean up
            throw err;
        }

        return { videoId, status: 'queued', statusUrl: `/hls/status/${videoId}` };
    }

    @Get('status/:videoId')
    @Public()
    async status(@Param('videoId') videoId: string) {
        if (!/^[0-9a-f-]{36}$/i.test(videoId)) throw new NotFoundException();

        const job = await this.queue.getJob(videoId);

        if (!job) {
            // job info expired, but the output may still exist
            if (existsSync(join(HlsService.HLS_DIR, videoId, 'master.m3u8'))) {
                return { status: 'completed', progress: 100, playlistUrl: `/stream/${videoId}/master.m3u8` };
            }
            throw new NotFoundException();
        }

        const state = await job.getState(); // waiting | active | completed | failed | delayed
        return {
            status: state,
            progress: typeof job.progress === 'number' ? job.progress : 0,
            playlistUrl: state === 'completed' ? job.returnvalue?.playlistUrl : undefined,
            error: state === 'failed' ? 'Conversion failed' : undefined,
        };
    }

    @Get('play-token/:videoId')
    @Public()
    async playToken(@Param('videoId') videoId: string) {
        if (!/^[0-9a-f-]{36}$/i.test(videoId)) throw new NotFoundException();
        if (!existsSync(join(HlsService.HLS_DIR, videoId, 'master.m3u8'))) {
            throw new NotFoundException();
        }

        const token = await this.jwt.signAsync({ vid: videoId }, { expiresIn: '2h' });
        return { token, expiresIn: 7200 };
    }
}