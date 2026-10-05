import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/members-entity';
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class MemberRepository extends BaseRepository<Member> {
    constructor(@InjectRepository(Member) repository: Repository<Member>) {
        super(repository);
    }
}
