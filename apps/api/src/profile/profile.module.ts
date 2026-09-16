import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entity/profile-entity';
import { ProfilesService } from './profile.service';
import { ProfilesController } from './profile.controller';
import { ProfileRepository } from './reposetory/profile.repo';
import { Content } from './entity/conetnt-entity';
import { Episode } from './entity/episode-entity';
import { Season } from './entity/season-entity';
import { WatchHistory } from './entity/watch.history-entity';
import { WatchlistItem } from './entity/watchlist.items-entity';

@Module({
    imports: [TypeOrmModule.forFeature([Profile, Content, Episode, Season, WatchHistory, WatchlistItem])],
    controllers: [ProfilesController],
    providers: [ProfilesService, ProfileRepository],
    exports: [ProfilesService],
})
export class ProfilesModule { }