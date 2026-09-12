import 'dotenv/config';

console.log(process.env.ROOM_DB_PASSWORD);

export default () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME!,
        password: process.env.DB_PASSWORD!,
        name: process.env.DB_NAME!,
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
    },
    api: {
        url: process.env.API_URL || 'http://localhost:3000'
    },
    internal: {
        secret: process.env.INTERNAL_SERVICE_SECRET!,
    },
    roomdb: {
        host: process.env.ROOM_DB_HOST,
        port: process.env.ROOM_DB_PORT,
        username: process.env.ROOM_DB_USERNAME,
        password: process.env.ROOM_DB_PASSWORD!,
        database: process.env.ROOM_DB_NAME,
    },

});
