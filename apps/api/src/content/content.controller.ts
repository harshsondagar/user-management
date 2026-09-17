import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { BrowseContentDto } from './dto/browse-content.dto';
import { ContentAccessGuard } from './gaurd/content.access-gaurd';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';

@UseGuards(JwtGuard)
@Controller('profiles/:profileId/content')
export class ContentController {
    constructor(private readonly contentService: ContentService) { }

    @Get()
    browse(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Query() query: BrowseContentDto,
    ) {
        return this.contentService.browseForProfile(
            user.id,
            profileId,
            query.page ?? 1,
            query.limit ?? 20,
        );
    }

    @Get(':contentId')
    getDetail(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.contentService.getDetailForProfile(user.id, profileId, contentId);
    }

    @Get(':contentId/play')
    @UseGuards(ContentAccessGuard)
    getMoviePlayback(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.contentService.getMoviePlaybackInfo(user.id, profileId, contentId);
    }

    @Get(':contentId/episodes/:episodeId/play')
    @UseGuards(ContentAccessGuard)
    getEpisodePlayback(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('episodeId') episodeId: string,
    ) {
        return this.contentService.getEpisodePlaybackInfo(user.id, profileId, episodeId);
    }
}