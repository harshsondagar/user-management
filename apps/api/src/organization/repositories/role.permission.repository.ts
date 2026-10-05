import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role.permission-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermission> {

    constructor(@InjectRepository(RolePermission) repository: Repository<RolePermission>) {
        super(repository);
    }


}
