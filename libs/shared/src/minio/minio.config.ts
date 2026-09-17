import * as dotenv from "dotenv"
import { join } from "path";
dotenv.config({ path: join(process.cwd(), 'lib/.env') });
import { registerAs } from '@nestjs/config';



export default registerAs('minio', () => ({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9001', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    bucket: process.env.MINIO_BUCKET || 'chat-media',
    presignExpirySeconds: parseInt(process.env.MINIO_PRESIGN_EXPIRY || '300', 10), // 5 min to upload
}));