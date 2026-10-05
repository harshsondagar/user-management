import { Global, Module } from "@nestjs/common";
import { SafeCacheService } from "./safe-cache.service";

@Global()
@Module({
    providers: [SafeCacheService],
    exports: [SafeCacheService],
})
export class RedisCacheModule { }