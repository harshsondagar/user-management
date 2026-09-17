import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repository/base.repository';
import { Episode } from '../entity/episode-entity';

@Injectable()
export class EpisodeRepository extends BaseRepository<Episode> {
    constructor(@InjectRepository(Episode) repository: Repository<Episode>) {
        super(repository);
    }
}