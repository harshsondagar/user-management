import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class OrganizationRepository extends BaseRepository<Organization> {

    constructor(@InjectRepository(Organization) repository: Repository<Organization>) {
        super(repository);
    }


}
