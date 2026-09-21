import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role.permission-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermission> {
    private readonly ormRepository: Repository<RolePermission>;

    constructor(@InjectRepository(RolePermission) repository: Repository<RolePermission>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
