import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
    private readonly ormRepository: Repository<Role>;

    constructor(@InjectRepository(Role) repository: Repository<Role>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
