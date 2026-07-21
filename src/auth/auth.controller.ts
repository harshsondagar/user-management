import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register-dto';
import * as argon2 from 'argon2'
import { RegisterResponseDTO } from './dto/register-responseDTO';
import { ApiWrappedResponse } from '../comman/decorator/api-response-wrapper.decorator';
import { ApiResponseDto } from '../comman/dto/api-response';
import { LoginDTO } from './dto/login-dto';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }

    @Post("register")
    @ApiWrappedResponse(RegisterResponseDTO)
    async register(@Body() body: RegisterDTO) {
        const passwordHash = await argon2.hash(body.password)

        const result = await this.authService.create({ ...body, passwordHash })

        return new ApiResponseDto({
            success: true,
            message: "successfully register",
            data: result
        })
    }

    // @Post("login")

    // async login(@Body() body: LoginDTO) {
    //     const res = await this.authService.login()
    // }

}
