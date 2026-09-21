import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/members-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class MemberRepository extends BaseRepository<Member> {
    private readonly ormRepository: Repository<Member>;

    constructor(@InjectRepository(Member) repository: Repository<Member>) {
        super(repository);
        this.ormRepository = repository;
    }

    async softDelete(id: string): Promise<void> {
        await this.ormRepository.softDelete(id);
    }
}
