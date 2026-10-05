import 'dotenv/config';


export default () => ({
    minio: {
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        useSSL: process.env.MINIO_USE_SSL === 'true', // Converts env string to boolean
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
        bucket: process.env.MINIO_BUCKET || 'my-bucket',
        presignExpirySeconds: process.env.MINIO_PRESIGN_EXPIRY!
    },
})