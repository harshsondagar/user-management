import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
    private readonly ormRepository: Repository<Permission>;

    constructor(@InjectRepository(Permission) repository: Repository<Permission>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
