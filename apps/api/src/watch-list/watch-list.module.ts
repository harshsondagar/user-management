import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesModule } from '../profile/profile.module';
import { WatchlistItem } from './entity/watchlist.items-entity';
import { WatchlistController } from './watch-list.controller';
import { WatchlistRepository } from './reposetories/watch-list.repo';
import { WatchlistService } from './watch-list.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([WatchlistItem]),
        ProfilesModule, // for ProfilesService.findOneForUser() ownership checks
    ],
    controllers: [WatchlistController],
    providers: [WatchlistRepository, WatchlistService],
    exports: [WatchlistService],
})
export class WatchlistModule { }