import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class OrganizationRepository extends BaseRepository<Organization> {
    private readonly ormRepository: Repository<Organization>;

    constructor(@InjectRepository(Organization) repository: Repository<Organization>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
