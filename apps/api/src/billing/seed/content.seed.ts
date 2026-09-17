/**
 * Seeds fake content so profile/watchlist/watch-history endpoints have
 * something real to point at during development.
 *
 * VIDEO PIPELINE STATUS: video_url below points at real, playable,
 * Creative-Commons-licensed sample videos (Blender Foundation open
 * movies + Google's public sample bucket) - NOT your actual catalog.
 * This lets you test playback/progress end-to-end right now. The real
 * pipeline (upload -> MinIO -> transcode queue -> background worker ->
 * final video_url written back onto the episode/content row) is
 * intentionally NOT built yet - marked as TODO further down. Nothing
 * here should be mistaken for production content ingestion.
 *
 * Run with your project's ts-node setup, e.g.:
 *   pnpm ts-node -r tsconfig-paths/register src/database/seeds/seed-content.ts
 * (adjust to however you already invoke `dataSource` for migrations)
 */

import { dataSource } from '../../config/data-source'; // adjust to your actual data-source.ts path
import { In } from 'typeorm';
import {
    Content,
    ContentType,
    ContentAccessType,
    ContentStatus,
} from "../../content/entity/conetnt-entity"
import { Season } from '../../content/entity/season-entity'; // adjust path
import { Episode } from '../../content/entity/episode-entity'; // adjust path
import { MaturityLevel } from '../../profile/entity/profile-entity'; // adjust path - shared 1-5 scale lives here, not on content-entity
import { randomUUID, UUID } from 'crypto';
// Real, license-clear sample videos - safe to use as throwaway seed data.
const SAMPLE_VIDEOS = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

function samplePoster(seed: string): string {
    // Deterministic fake poster art - same seed always returns the same
    // image, so re-running this script gives visually stable results.
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/600`;
}

function sampleBackdrop(seed: string): string {
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}-backdrop/1600/900`;
}

let videoCursor = 0;
function nextSampleVideoUrl(): string {
    const url = SAMPLE_VIDEOS[videoCursor % SAMPLE_VIDEOS.length];
    videoCursor += 1;
    return url;
}
const MOVIE_SEEDS: Array<{
    id: string;
    title: string;
    synopsis: string;
    releaseYear: number;
    maturityLevel: MaturityLevel;
    durationSeconds: number;
    accessType: ContentAccessType;
}> = [
        {
            id: '9acdf475-0c45-4dc9-8b5c-d25db84d2c31',
            title: 'Silent Horizon',
            synopsis: 'A lone astronaut drifts toward a signal that shouldn\u2019t exist.',
            releaseYear: 2023,
            maturityLevel: MaturityLevel.TEEN,
            durationSeconds: 6300, // 105 min
            accessType: ContentAccessType.PREMIUM,
        },
        {
            id: '99413bc8-c28d-4695-b77c-32152cf2ef61',
            title: 'Paper Lanterns',
            synopsis: 'Three childhood friends reunite for one last summer festival.',
            releaseYear: 2021,
            maturityLevel: MaturityLevel.OLDER_KIDS,
            durationSeconds: 5700, // 95 min
            accessType: ContentAccessType.FREE,
        },
        {
            id: '17f20d27-868b-4dd8-8915-1fe022eddad8',
            title: 'Iron Tide',
            synopsis: 'A dockworker uncovers a smuggling ring tied to her own family.',
            releaseYear: 2024,
            maturityLevel: MaturityLevel.MATURE_TEEN,
            durationSeconds: 7200, // 120 min
            accessType: ContentAccessType.PREMIUM,
        },
        {
            id: 'a7a9b833-dd43-418b-a212-53a711442361',
            title: 'Little Rocket',
            synopsis: 'A backyard-built rocket, a curious kid, and one very patient dog.',
            releaseYear: 2020,
            maturityLevel: MaturityLevel.KIDS,
            durationSeconds: 4800, // 80 min
            accessType: ContentAccessType.FREE,
        },
    ];

const SERIES_SEEDS: Array<{
    id: string;
    title: string;
    synopsis: string;
    releaseYear: number;
    maturityLevel: MaturityLevel;
    accessType: ContentAccessType;
    seasons: Array<{ seasonNumber: number; episodeCount: number }>;
}> = [
        {
            id: 'a99d2493-8992-46ee-bfe3-ceb5d2d9bb39',
            title: 'The Long Signal',
            synopsis: 'A deep-space listening post picks up something that keeps repeating.',
            releaseYear: 2022,
            maturityLevel: MaturityLevel.MATURE_TEEN,
            accessType: ContentAccessType.PREMIUM,
            seasons: [
                { seasonNumber: 1, episodeCount: 6 },
                { seasonNumber: 2, episodeCount: 6 },
            ],
        },
        {
            id: '3ecc97c7-75cf-4a07-ab2e-83b194c52ea0',
            title: 'Kettle & Stone',
            synopsis: 'A small-town tea house becomes the unlikely center of a family feud.',
            releaseYear: 2023,
            maturityLevel: MaturityLevel.TEEN,
            accessType: ContentAccessType.PREMIUM,
            seasons: [{ seasonNumber: 1, episodeCount: 8 }],
        },
        {
            id: 'a181bab0-df9f-4d7f-9cc0-6efc634108a0',
            title: 'Bramblewood Academy',
            synopsis: 'Magic school shenanigans for the under-10 crowd.',
            releaseYear: 2019,
            maturityLevel: MaturityLevel.KIDS,
            accessType: ContentAccessType.FREE,
            seasons: [
                { seasonNumber: 1, episodeCount: 10 },
                { seasonNumber: 2, episodeCount: 10 },
            ],
        },
    ];

async function seedMovies(dsContentRepo: ReturnType<typeof dataSource.getRepository>) {
    const created: Content[] = [];
    for (const movie of MOVIE_SEEDS) {
        const content = dsContentRepo.create({
            id: movie.id,
            type: ContentType.MOVIE,
            title: movie.title,
            synopsis: movie.synopsis,
            releaseYear: movie.releaseYear,
            posterUrl: samplePoster(movie.title),
            backdropUrl: sampleBackdrop(movie.title),
            maturityLevel: movie.maturityLevel,
            durationSeconds: movie.durationSeconds,
            videoUrl: nextSampleVideoUrl(),
            accessType: movie.accessType,
            status: ContentStatus.PUBLISHED, // without this, browse() would never see any seeded row - it filters on PUBLISHED
            // TODO: replace with the real MinIO-hosted URL once the
            // upload -> transcode queue -> worker pipeline exists.
            // See seed script header for what "real" pipeline means here.
        });
        created.push(await dsContentRepo.save(content as any));
    }
    return created;
}

async function seedSeries(
    dsContentRepo: ReturnType<typeof dataSource.getRepository>,
    dsSeasonRepo: ReturnType<typeof dataSource.getRepository>,
    dsEpisodeRepo: ReturnType<typeof dataSource.getRepository>,
) {
    for (const series of SERIES_SEEDS) {
        const content = await dsContentRepo.save(
            dsContentRepo.create({
                id: series.id,
                type: ContentType.SERIES,
                title: series.title,
                synopsis: series.synopsis,
                releaseYear: series.releaseYear,
                posterUrl: samplePoster(series.title),
                backdropUrl: sampleBackdrop(series.title),
                maturityLevel: series.maturityLevel,
                durationSeconds: null, // duration lives per-episode for series
                accessType: series.accessType,
                status: ContentStatus.PUBLISHED,
            }),
        );

        for (const seasonSeed of series.seasons) {
            const season = await dsSeasonRepo.save(
                dsSeasonRepo.create({
                    id: randomUUID(),
                    seriesId: content.id,
                    seasonNumber: seasonSeed.seasonNumber,
                    title: `Season ${seasonSeed.seasonNumber}`,
                }),
            );

            for (let ep = 1; ep <= seasonSeed.episodeCount; ep++) {
                await dsEpisodeRepo.save(
                    dsEpisodeRepo.create({
                        id: randomUUID(),
                        seasonId: season.id,
                        episodeNumber: ep,
                        title: `Episode ${ep}`,
                        synopsis: `${series.title} - S${seasonSeed.seasonNumber}E${ep}.`,
                        durationSeconds: 1500 + Math.floor(Math.random() * 900), // 25-40 min
                        // TODO: same as movies above - fake, playable sample video
                        // standing in for the real per-episode pipeline output.
                        videoUrl: nextSampleVideoUrl(),
                        thumbnailUrl: sampleBackdrop(`${series.title}-s${seasonSeed.seasonNumber}e${ep}`),
                    }),
                );
            }
        }
    }
}

async function main() {
    await dataSource.initialize();

    const contentRepo = dataSource.getRepository(Content);
    const seasonRepo = dataSource.getRepository(Season);
    const episodeRepo = dataSource.getRepository(Episode);

    // Idempotent-ish: wipe anything from a previous run of THIS script by
    // title before re-seeding, so you can re-run freely during development
    // without piling up duplicates. Cascades to seasons/episodes via FK.
    const allTitles = [...MOVIE_SEEDS.map((m) => m.title), ...SERIES_SEEDS.map((s) => s.title)];
    await contentRepo.delete({ title: In(allTitles) });

    const movies = await seedMovies(contentRepo);
    await seedSeries(contentRepo, seasonRepo, episodeRepo);

    console.log(`Seeded ${movies.length} movies and ${SERIES_SEEDS.length} series.`);
    await dataSource.destroy();
}

main().catch(async (err) => {
    console.error('Seed failed:', err);
    await dataSource.destroy();
    process.exit(1);
});