import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Content, ContentAccessType, ContentType } from '../../content/entity/conetnt-entity';  // adjust path
import { UserSubscription, SubscriptionStatus } from '../../billing/entities/user-subscription-entity';
import { Episode } from '../../content/entity/episode-entity';
@Injectable()
export class WatchTrackingService {
    private readonly logger = new Logger(WatchTrackingService.name);

    constructor(private readonly dataSource: DataSource) { }

    async recordProgress(userId: string, mediaId: string, deltaSeconds: number): Promise<void> {
        if (deltaSeconds <= 0) return;

        const resolved = await this.resolveEarningContent(mediaId);

        if (!resolved) {
            this.logger.warn(`Watch progress for unknown media ${mediaId}, ignoring`);
            return;
        }
        const { earningContentId, organizationId, accessType } = resolved;

        const countsForEarnings = await this.isEligibleForEarnings(userId, accessType);
        console.log(countsForEarnings);

        const day = new Date().toISOString().slice(0, 10); // UTC date, e.g. '2026-09-29'

        await this.dataSource.transaction(async (manager) => {
            await manager.query(
                `
        INSERT INTO watch_stats ("userId", "contentId", "organizationId", "day", "seconds", "countsForEarnings", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        ON CONFLICT ("userId", "contentId", "day")
        DO UPDATE SET seconds = watch_stats.seconds + EXCLUDED.seconds, "updatedAt" = now()
        `,
                [userId, earningContentId, organizationId, day, deltaSeconds, countsForEarnings],
            );
        });
    }

    /**
     * Tries Episode first (the common case — a player watching a specific episode),
     * then falls back to Content directly (a MOVIE, or however your player reports
     * watching a SERIES as a whole, if that's a thing in your app).
     *
     * CONFIRM: does Episode -> Season -> Content actually chain like this in your schema?
     * Your original entity list only showed Episode.seasonId/season — I'm assuming Season
     * has a contentId/content relation pointing back to the parent series. Adjust the
     * `season.content` access below to match your real Season entity's field name.
     */
    private async resolveEarningContent(
        mediaId: string,
    ): Promise<{ earningContentId: string; organizationId: string; accessType: string } | null> {
        const episodeRepo = this.dataSource.getRepository(Episode);
        const episode = await episodeRepo.findOne({
            where: { id: mediaId },
            relations: ['season', 'season.series'],
        });

        if (episode) {
            const seriesContent = (episode as any).season?.series;
            if (!seriesContent) {
                this.logger.error(`Episode ${mediaId} has no resolvable parent series — check Season.series relation`);
                return null;
            }
            return {
                earningContentId: seriesContent.id,
                organizationId: seriesContent.organizationId,
                accessType: seriesContent.accessType,
            };
        }

        // Not an episode — try Content directly (a MOVIE, or a SERIES watched as a unit)
        const contentRepo = this.dataSource.getRepository(Content);
        const content = await contentRepo.findOne({ where: { id: mediaId } });
        if (!content) return null;

        return {
            earningContentId: content.id,
            organizationId: content.organizationId,
            accessType: content.accessType,
        };
    }

    /**
     * A viewer's watch time counts toward org earnings only if:
     *   - they're on an ACTIVE paid plan (not free, not lapsed), AND
     *   - the content itself requires a subscription (not free-access content)
     * Adjust the accessType/plan-status checks to match your actual enum values.
     */
    private async isEligibleForEarnings(userId: string, contentAccessType: string): Promise<boolean> {
        if (contentAccessType !== ContentAccessType.PREMIUM) return false; // free-access content never earns

        const subRepo = this.dataSource.getRepository(UserSubscription);
        const sub = await subRepo.findOne({
            where: { userId, status: SubscriptionStatus.ACTIVE },
            order: { createdAt: 'DESC' },
        });
        if (!sub) return false;

        return true;
    }
}
