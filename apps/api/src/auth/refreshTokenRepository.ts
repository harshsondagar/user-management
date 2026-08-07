import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../common/repository/base.repository";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, FindOptionsWhere, Repository } from "typeorm";
import { RefreshToken } from "@app/shared";

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
    constructor(@InjectRepository(RefreshToken) repository: Repository<RefreshToken>) {
        super(repository)
    }

    async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
        return this.findOneBy({ tokenHash }); // inherited from BaseRepository
    }

    async createRefreshToken(data: DeepPartial<RefreshToken>): Promise<RefreshToken> {
        return this.create(data); // inherited create() already does create()+save()
    }

    async revokeById(id: string): Promise<void> {
        await this.updateBy({ id } as FindOptionsWhere<RefreshToken>, { revoked: true });
    }
    async revokeByFamilyId(familyId: string): Promise<void> {
        await this.updateBy({ familyId } as FindOptionsWhere<RefreshToken>, { revoked: true });
    }
    async revokeByUserId(userId: string): Promise<void> {
        await this.updateBy({ userId } as FindOptionsWhere<RefreshToken>, { revoked: true });
    }

}