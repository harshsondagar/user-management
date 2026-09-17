import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Profile } from '../entity/profile-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class ProfileRepository extends BaseRepository<Profile> {

    private readonly ormRepository: Repository<Profile>;

    constructor(@InjectRepository(Profile) repository: Repository<Profile>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}