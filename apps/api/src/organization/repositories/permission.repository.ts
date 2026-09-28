import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
    constructor(@InjectRepository(Permission) repository: Repository<Permission>) {
        super(repository);
    }

}
