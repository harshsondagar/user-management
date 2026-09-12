import * as dotenv from "dotenv"
import path, { resolve } from "path"
dotenv.config({ path: resolve(path.join(process.cwd(), "apps/queue-service/.env.cp.api")) })

export default () => ({
    roomdb: {
        host: process.env.ROOM_DB_HOST,
        port: process.env.ROOM_DB_PORT,
        username: process.env.ROOM_DB_USERNAME,
        password: process.env.ROOM_DB_PASSWORD!,
        database: process.env.ROOM_DB_NAME,
    },
})