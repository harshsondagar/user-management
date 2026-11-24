import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class HlsService {
    private readonly logger = new Logger(HlsService.name);

    static readonly UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');
    static readonly HLS_DIR = join(process.cwd(), 'storage', 'hls');

    async convertToHls(inputPath: string, videoId: string): Promise<string> {
        const outDir = join(HlsService.HLS_DIR, videoId);
        await mkdir(outDir, { recursive: true });

        const args = [
            '-i', inputPath,
            '-codec:v', 'libx264',
            '-codec:a', 'aac',
            '-hls_time', '4',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', join(outDir, 'seg_%03d.ts'),
            join(outDir, 'index.m3u8'),
        ];

        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args);

            ffmpeg.stderr.on('data', (d) => this.logger.debug(d.toString()));
            ffmpeg.on('error', reject); // e.g. ffmpeg not installed
            ffmpeg.on('close', (code) => {
                if (code === 0) resolve(`/stream/${videoId}/index.m3u8`);
                else reject(new Error(`FFmpeg exited with code ${code}`));
            });
        });
    }
}