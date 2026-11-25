import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

interface Rendition {
    name: string;
    width: number;
    height: number;
    videoBitrate: string; // for FFmpeg
    audioBitrate: string;
    bandwidth: number;    // for master playlist (bits/sec)
}

const RENDITIONS: Rendition[] = [
    { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k', bandwidth: 900000 },
    { name: '720p', width: 1280, height: 720, videoBitrate: '2800k', audioBitrate: '128k', bandwidth: 2900000 },
    { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k', bandwidth: 5200000 },
];

@Injectable()
export class HlsService {
    private readonly logger = new Logger(HlsService.name);

    static readonly UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');
    static readonly HLS_DIR = join(process.cwd(), 'storage', 'hls');

    private async encodeRendition(inputPath: string, baseDir: string, r: Rendition) {
        const outDir = join(baseDir, r.name);
        await mkdir(outDir, { recursive: true });

        const args = [
            '-i', inputPath,
            // scale to fit inside WxH, keep aspect ratio, pad with black bars if needed
            '-vf', `scale=w=${r.width}:h=${r.height}:force_original_aspect_ratio=decrease,pad=${r.width}:${r.height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-profile:v', 'main',
            '-preset', 'veryfast',
            '-b:v', r.videoBitrate,
            '-maxrate', r.videoBitrate,
            '-bufsize', `${parseInt(r.videoBitrate) * 2}k`,
            // keyframe every 4s at 30fps so every quality cuts at the same points
            '-g', '120',
            '-keyint_min', '120',
            '-sc_threshold', '0',
            '-c:a', 'aac',
            '-b:a', r.audioBitrate,
            '-ar', '48000',
            '-hls_time', '4',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', join(outDir, 'seg_%03d.ts'),
            join(outDir, 'index.m3u8'),
        ];

        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ['-y', ...args]);
            ffmpeg.stderr.on('data', (d) => this.logger.debug(d.toString()));
            ffmpeg.on('error', reject);
            ffmpeg.on('close', (code) =>
                code === 0 ? resolve() : reject(new Error(`FFmpeg ${r.name} failed: code ${code}`)),
            );
        });

        this.logger.log(`Finished ${r.name}`);
    }

    private async writeMasterPlaylist(baseDir: string) {
        const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
        for (const r of RENDITIONS) {
            lines.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height},CODECS="avc1.4d401f,mp4a.40.2"`,
                `${r.name}/index.m3u8`,
            );
        }
        await writeFile(join(baseDir, 'master.m3u8'), lines.join('\n') + '\n');
    }
    async convertToHls(
        inputPath: string,
        videoId: string,
        onProgress?: (percent: number) => void,
    ): Promise<string> {
        const baseDir = join(HlsService.HLS_DIR, videoId);
        await mkdir(baseDir, { recursive: true });

        for (let i = 0; i < RENDITIONS.length; i++) {
            await this.encodeRendition(inputPath, baseDir, RENDITIONS[i]);
            onProgress?.(Math.round(((i + 1) / RENDITIONS.length) * 100));
        }

        await this.writeMasterPlaylist(baseDir);
        return `/stream/${videoId}/master.m3u8`;
    }
}