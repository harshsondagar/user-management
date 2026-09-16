import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { WatchHistoryService } from './watch.history.service';
import { UpsertProgressDto } from './dto/upsert.progress.dto';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';

@UseGuards(JwtGuard)
@Controller('/profiles/:profileId/watch-history')
export class WatchHistoryController {
    constructor(private readonly watchHistoryService: WatchHistoryService) { }

    @Put('movies/:contentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    recordMovieProgress(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
        @Body() dto: UpsertProgressDto,
    ) {
        return this.watchHistoryService.recordMovieProgress(user.id, profileId, contentId, dto);
    }

    @Put('episodes/:episodeId')
    @HttpCode(HttpStatus.NO_CONTENT)
    recordEpisodeProgress(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('episodeId') episodeId: string,
        @Body() dto: UpsertProgressDto,
    ) {
        return this.watchHistoryService.recordEpisodeProgress(user.id, profileId, episodeId, dto);
    }

    @Delete('movies/:contentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeMovieProgress(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.watchHistoryService.removeMovieProgress(user.id, profileId, contentId);
    }

    @Delete('episodes/:episodeId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeEpisodeProgress(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('episodeId') episodeId: string,
    ) {
        return this.watchHistoryService.removeEpisodeProgress(user.id, profileId, episodeId);
    }

    @Get('continue-watching')
    getContinueWatching(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
    ) {
        return this.watchHistoryService.getContinueWatching(user.id, profileId);
    }
}