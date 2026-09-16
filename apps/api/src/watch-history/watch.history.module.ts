import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchHistory } from './entity/watch.history-entity';
import { WatchHistoryRepository } from './repositories/watch-history.repo';
import { WatchHistoryService } from './watch.history.service';
import { WatchHistoryController } from './watch.history.controller';
import { ProfilesModule } from '../profile/profile.module';
import { WatchlistItem } from '../watch-list/entity/watchlist.items-entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([WatchHistory, WatchlistItem]),
        ProfilesModule,
    ],
    controllers: [WatchHistoryController],
    providers: [WatchHistoryRepository, WatchHistoryService],
    exports: [WatchHistoryService],
})
export class WatchHistoryModule { }