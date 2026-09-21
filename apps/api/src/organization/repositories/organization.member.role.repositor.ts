import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberRole } from '../entities/organization.member.role-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class OrganizationMemberRoleRepository extends BaseRepository<OrganizationMemberRole> {
    private readonly ormRepository: Repository<OrganizationMemberRole>;

    constructor(@InjectRepository(OrganizationMemberRole) repository: Repository<OrganizationMemberRole>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
