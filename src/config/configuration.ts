import 'dotenv/config';

export default () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME!,
        password: process.env.DB_PASSWORD!,
        name: process.env.DB_NAME,
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    },
    throttle: {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
    },
    cookie: {
        name: process.env.REFRESH_COOKIE_NAME!
    },
    admin: {
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD!
    },
    redis: {
        host: process.env.REDIS_HOST!,
        port: process.env.REDIS_PORT!,
        password: process.env.REDIS_PASSWORD!
    },
    smtp: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
        mail_from: process.env.MAIL_FROM!,
        host: process.env.SMTP_HOST!,
        port: process.env.SMTP_PORT!,
    },
    dataGovIn: {
        apiKey: process.env.DATA_GOV_IN_API_KEY,
        resourceApiBaseUrl: process.env.DATA_GOV_IN_RESOURCE_API_URL || 'https://api.data.gov.in',
        portalBackendUrl: process.env.DATA_GOV_IN_PORTAL_BACKEND_URL || 'https://www.data.gov.in/backend/dmspublic/v1',
    },
    mongodb: {
        uri: process.env.MONGO_URI!
    }
});
