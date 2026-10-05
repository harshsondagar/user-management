import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Content, ContentStatus } from '../entity/conetnt-entity'
import { BaseRepository } from '../../common/repository/base.repository';

@Injectable()
export class ContentRepository extends BaseRepository<Content> {
    constructor(@InjectRepository(Content) repository: Repository<Content>) {
        super(repository);
    }

    async browse(
        maxMaturityLevel: number,
        page: number,
        limit: number,
    ): Promise<{ items: Content[]; total: number }> {
        const [items, total] = await this.repository.findAndCount({
            where: {
                status: ContentStatus.PUBLISHED,
                maturityLevel: LessThanOrEqual(maxMaturityLevel),
            },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total };
    }


    async getDetailForProfile(
        contentId: string,
        maxMaturityLevel: number,
    ): Promise<Content | null> {
        return this.repository
            .createQueryBuilder('content')
            .leftJoinAndSelect('content.seasons', 'season')
            .leftJoinAndSelect('season.episodes', 'episode')
            .where('content.id = :contentId', { contentId })
            .andWhere('content.status = :status', { status: ContentStatus.PUBLISHED })
            .andWhere('content.maturityLevel <= :maxMaturityLevel', { maxMaturityLevel })
            .orderBy('season.seasonNumber', 'ASC')
            .addOrderBy('episode.episodeNumber', 'ASC')
            .getOne();
    }
}