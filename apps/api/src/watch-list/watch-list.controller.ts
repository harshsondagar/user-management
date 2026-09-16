import {
    Controller,
    Get,
    Put,
    Delete,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { WatchlistService } from './watch-list.service';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';

@UseGuards(JwtGuard)
@Controller('profiles/:profileId/watchlist')
export class WatchlistController {
    constructor(private readonly watchlistService: WatchlistService) { }

    @Get()
    list(@currentUser() user: User, @Param('profileId') profileId: string) {
        return this.watchlistService.list(user.id, profileId);
    }

    @Put(':contentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    add(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.watchlistService.add(user.id, profileId, contentId);
    }

    @Delete(':contentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @currentUser() user: User,
        @Param('profileId') profileId: string,
        @Param('contentId') contentId: string,
    ) {
        return this.watchlistService.remove(user.id, profileId, contentId);
    }
}