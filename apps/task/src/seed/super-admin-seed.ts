import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { User, UserRole } from "../user/user-entity";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2"
import { ARGON2_OPTIONS } from "../auth/auth.service";

@Injectable()
export class SuperAdminSeed implements OnApplicationBootstrap {
    private readonly logger = new Logger(SuperAdminSeed.name)

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>, private readonly config: ConfigService) { }

    async onApplicationBootstrap() {
        const email = this.config.get<string>('admin.email')
        const password = this.config.get<string>('admin.password')

        if (!email || !password) {
            this.logger.warn('Super Admin environment credentials missing. Skipping seed.');
            return;
        }

        const isSuperAdminExist = await this.userRepository.findOne({ where: { email } })

        if (!isSuperAdminExist) {
            this.logger.log('No Super Admin found. Creating default Main Admin account...');

            const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

            const superAdmin = this.userRepository.create({
                email: email,
                passwordHash: passwordHash,
                role: UserRole.SUPER_ADMIN,
                isEmailVerified: true,
            });


            await this.userRepository.save(superAdmin);
            this.logger.log(`Main Admin successfully created with email: ${email}`);
        } else {
            this.logger.log('Main Admin account already verified in database.');
        }
    }
}   