import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create.profile.dto';
import { UpdateProfileDto } from './dto/update.profile.dto';
import { SetPinDto, VerifyPinDto } from './dto/pin.dto';
import { JwtGuard } from '../auth/gurads/jwt.guard';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';
import { ProfilesService } from './profile.service';
import { SelectProfileDto } from './dto/select.profile.dto';
import { AuthService } from '../auth/auth.service';


@UseGuards(JwtGuard)
@Controller('profiles')
export class ProfilesController {
    constructor(
        private readonly profilesService: ProfilesService,
        private readonly authService: AuthService
    ) { }

    @Get()
    findAll(@currentUser() user: User) {
        return this.profilesService.findAllForUser(user.id);
    }

    @Get(':id')
    findOne(@currentUser() user: User, @Param('id') id: string) {
        return this.profilesService.findOneForUser(user.id, id);
    }

    @Post()
    create(@currentUser() user: User, @Body() dto: CreateProfileDto) {
        return this.profilesService.create(user.id, dto);
    }

    @Patch(':id')
    update(
        @currentUser() user: User,
        @Param('id') id: string,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profilesService.update(user.id, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@currentUser() user: User, @Param('id') id: string) {
        return this.profilesService.remove(user.id, id);
    }

    @Post(':id/pin')
    @HttpCode(HttpStatus.NO_CONTENT)
    setPin(
        @currentUser() user: User,
        @Param('id') id: string,
        @Body() dto: SetPinDto,
    ) {
        return this.profilesService.setPin(user.id, id, dto.pin);
    }

    @Delete(':id/pin')
    @HttpCode(HttpStatus.NO_CONTENT)
    removePin(@currentUser() user: User, @Param('id') id: string) {
        return this.profilesService.removePin(user.id, id);
    }

    @Post(':id/pin/verify')
    @HttpCode(HttpStatus.OK)
    verifyPin(
        @currentUser() user: User,
        @Param('id') id: string,
        @Body() dto: VerifyPinDto,
    ) {
        return this.profilesService.verifyPin(user.id, id, dto.pin);
    }

    @Post(':id/select')
    @HttpCode(HttpStatus.OK)
    async selectProfile(
        @currentUser() user: User,
        @Param('id') profileId: string,
        @Body() dto: SelectProfileDto,
    ) {
        const profile = await this.profilesService.findOneForUser(user.id, profileId);

        if (profile.pinEnabled) {
            if (!dto.pin) {
                throw new BadRequestException('This profile requires a PIN to select');
            }
            await this.profilesService.verifyPin(user.id, profileId, dto.pin);
        }

        const { accessToken } = await this.authService.issueAccessTokenWithActiveProfile(
            user,
            profileId,
        );

        return { accessToken, profile };
    }
}