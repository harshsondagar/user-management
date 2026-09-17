import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entity/profile-entity';
import { ProfilesService } from './profile.service';
import { ProfilesController } from './profile.controller';
import { ProfileRepository } from './reposetory/profile.repo';
import { Content } from '../content/entity/conetnt-entity';
import { Episode } from '../content/entity/episode-entity';
import { Season } from '../content/entity/season-entity';
import { WatchHistory } from '../watch-history/entity/watch.history-entity';
import { WatchlistItem } from '../watch-list/entity/watchlist.items-entity';

@Module({
    imports: [TypeOrmModule.forFeature([Profile, Content, Episode, Season, WatchHistory, WatchlistItem])],
    controllers: [ProfilesController],
    providers: [ProfilesService, ProfileRepository],
    exports: [ProfilesService],
})
export class ProfilesModule { }