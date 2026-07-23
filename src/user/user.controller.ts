import { Body, Controller, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from './user-entity';
import { ApiResponseDto } from '../common/dto/api-response';
import { UpdateUserDTO } from './dto/UpdateUserDTO';

@Controller('user')
export class UserController {
    constructor(private readonly userServices: UserService) { }

    @Put()
    async changeUSer(@currentUser() user: User, @Body() body: UpdateUserDTO) {
        await this.userServices.updateUser(user.id, body);
        return new ApiResponseDto({ success: true });
    }
}
