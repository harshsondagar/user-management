import * as dotenv from "dotenv"
import { join, resolve } from "path";
const envFileName = process.env.ENV_FILE ?? ".env";
dotenv.config({
    path: resolve(join(process.cwd(), `/apps/ws-service/${envFileName}`))
})
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from "ioredis";

export class RedisIOAdepter extends IoAdapter {
    private adapterConstructor!: ReturnType<typeof createAdapter>

    async connectToRedis(): Promise<void> {

        const pubClient = new Redis(process.env.REDIS_URL!);
        const subClient = pubClient.duplicate();

        pubClient.on('error', (err) => console.error('Redis pub client error:', err));
        subClient.on('error', (err) => console.error('Redis sub client error:', err));

        this.adapterConstructor = createAdapter(pubClient, subClient)
    }

    createIOServer(port: number, options?: any) {
        const server = super.createIOServer(port, options);
        server.adapter(this.adapterConstructor);
        return server;
    }
}