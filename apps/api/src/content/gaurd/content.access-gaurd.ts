import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ContentAccessType, ContentStatus } from '../entity/conetnt-entity'
import { Episode } from '../entity/episode-entity'
import { SubscriptionsService } from '../service/subsciption.service';

interface AuthenticatedRequestUser {
    id: string;
}

interface ContentAccessInfo {
    status: ContentStatus;
    accessType: ContentAccessType;
}

@Injectable()
export class ContentAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
        @InjectRepository(Episode) private readonly episodeRepo: Repository<Episode>,
        private readonly subscriptionsService: SubscriptionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthenticatedRequestUser | undefined;
        const params = request.params as Record<string, string>;

        const info = await this.resolveAccessInfo({
            contentId: params.contentId,
            episodeId: params.episodeId,
        });

        if (!info || info.status !== ContentStatus.PUBLISHED) {
            throw new NotFoundException('Content not found');
        }

        if (info.accessType === ContentAccessType.FREE) {
            return true;
        }

        if (!user) {
            throw new ForbiddenException('Sign in required to stream this title');
        }

        const hasPaidAccess = await this.subscriptionsService.hasActivePaidSubscription(user.id);
        if (!hasPaidAccess) {
            throw new ForbiddenException('This title requires an active subscription');
        }

        return true;
    }

    private async resolveAccessInfo(params: {
        contentId?: string;
        episodeId?: string;
    }): Promise<ContentAccessInfo | null> {
        if (params.contentId) {
            const content = await this.contentRepo.findOne({ where: { id: params.contentId } });
            return content ? { status: content.status, accessType: content.accessType } : null;
        }

        if (params.episodeId) {
            const row = await this.episodeRepo
                .createQueryBuilder('episode')
                .innerJoin('episode.season', 'season')
                .innerJoin('season.series', 'series')
                .select(['series.status AS status', 'series.accessType AS "accessType"'])
                .where('episode.id = :episodeId', { episodeId: params.episodeId })
                .getRawOne();
            return row ? { status: row.status, accessType: row.accessType } : null;
        }

        return null;
    }
}