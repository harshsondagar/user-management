import "dotenv/config"
import { Body, Controller, HttpCode, HttpStatus, InternalServerErrorException, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { ARGON2_OPTIONS, AuthService } from './auth.service';
import { RegisterDTO } from './dto/register-dto';
import * as argon2 from 'argon2'
import { RegisterResponseDTO } from './dto/register-responseDTO';
import { ApiWrappedResponse } from '../common/decorator/api-response-wrapper.decorator';
import { ApiResponseDto } from '../common/dto/api-response';
import { LocalAuthGuard } from './gurads/localAuth.guard';
import { User } from '../user/user-entity';
import * as e from 'express';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { Public } from '../common/decorator/public-decoretor';
import { LoginResponse } from './dto/Login.response.dto';
import { ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login-dto';
import { RefreshGuard } from './gurads/jwt-refresh.guard';
import { JwtGuard } from "./gurads/jwt.guard";
import { changePasswordDTO } from "./dto/changePassword-dto";

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME!

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post("register")
    @ApiWrappedResponse(RegisterResponseDTO)
    async register(@Body() body: RegisterDTO) {

        const passwordHash = await argon2.hash(body.password, ARGON2_OPTIONS)

        const result = await this.authService.create({ ...body, passwordHash })

        return new ApiResponseDto({
            success: true,
            message: "successfully register",
            data: result
        })
    }

    @Public()
    @Post("login")
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: LoginDto })
    @ApiWrappedResponse(LoginResponse)
    async login(@Body() _body: LoginDto, @currentUser() user: User, @Req() req: e.Request, @Res({ passthrough: true }) res: e.Response) {
        const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.authService.login(user, req.get('user-agent'), req.ip)
        this.setRefreshCookie(res, refreshToken, refreshTokenExpiresAt)

        return new ApiResponseDto({
            success: true,
            message: "successfully register",
            data: new LoginResponse({
                id: user.id, firstName: user.firstName, accessToken
            })
        })
    }

    @Public()
    @Post("refresh")
    @UseGuards(RefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiWrappedResponse(LoginResponse)
    async refresh(@Req() req: e.Request & { user: { sub: string, rawToken: string, firstName: string } }, @Res({ passthrough: true }) res: e.Response) {

        const { sub, rawToken, firstName } = req.user

        const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.authService.refreshToken(sub, rawToken, req.get('user-agent')!, req.ip!)

        this.setRefreshCookie(res, refreshToken, refreshTokenExpiresAt)

        return new ApiResponseDto({
            success: true,
            message: "successfully refresh",
            data: new LoginResponse({
                id: sub, accessToken
            })
        })
    }

    @UseGuards(JwtGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @currentUser() user: User,
        @Req() req: e.Request,
        @Res({ passthrough: true }) res: e.Response,
    ) {
        const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

        await this.authService.logout(user.id, rawToken);

        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });

        return new ApiResponseDto({ success: true });
    }

    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout-all')
    async logoutAll(@currentUser() user: User, @Req() req: e.Request, @Res({ passthrough: true }) res: e.Response) {
        await this.authService.removeAllSession(user.id)

        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" })
        return new ApiResponseDto({ success: true });
    }


    @UseGuards(JwtGuard)
    @Patch('password')
    @HttpCode(HttpStatus.OK)
    async changePassword(@currentUser() user: User, @Body() Body: changePasswordDTO) {
        console.log(user);

        await this.authService.changePassword(user.id, Body.password)
        return new ApiResponseDto({ success: true })
    }

    @UseGuards(JwtGuard)


    private setRefreshCookie(res: e.Response, token: string, expireAt: Date) {
        res.cookie(REFRESH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/auth",
            sameSite: false,
            expires: expireAt,
        })
    }
}
