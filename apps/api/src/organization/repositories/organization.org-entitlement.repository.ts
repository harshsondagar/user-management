import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repository/base.repository';
import { OrganizationSubscription } from '../entities/organization-subsciription-entity';

@Injectable()
export class OrganizationSubscriptionRepository extends BaseRepository<OrganizationSubscription> {
    constructor(@InjectRepository(OrganizationSubscription) repository: Repository<OrganizationSubscription>) {
        super(repository);
    }
}
