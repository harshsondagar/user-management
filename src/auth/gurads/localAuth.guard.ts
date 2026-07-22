import { BadRequestException, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "../dto/login-dto";



@Injectable()

export class LocalAuthGuard extends AuthGuard('local') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const dto = plainToInstance(LoginDto, req.body);
        const errors = await validate(dto);

        if (errors.length > 0) {
            const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
            throw new BadRequestException(messages);
        }

        return super.canActivate(context) as Promise<boolean>;
    }

}