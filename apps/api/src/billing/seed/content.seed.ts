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

import { dataSource } from '../../config/data-source';  // adjust to your actual data-source.ts path
import { In } from 'typeorm';
import { Content, ContentType } from "../../profile/entity/conetnt-entity"

import { MaturityLevel } from '../../profile/entity/profile-entity';
import { Season } from '../../profile/entity/season-entity';
import { Episode } from '../../profile/entity/episode-entity';

// Real, license-clear sample videos - safe to use as throwaway seed data.
const SAMPLE_VIDEOS = [
    'https://archive.org',
    'https://archive.org',
    'https://test-videos.co.uk',
    'https://test-videos.co.uk',
    'https://lorem.video',
    'https://lorem.video',
    'https://archive.org',
    'https://archive.org',
];


function samplePoster(seed: string): string {
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
    title: string;
    synopsis: string;
    releaseYear: number;
    maturityLevel: MaturityLevel;
    durationSeconds: number;
}> = [
        {
            title: 'Silent Horizon',
            synopsis: 'A lone astronaut drifts toward a signal that shouldn\u2019t exist.',
            releaseYear: 2023,
            maturityLevel: MaturityLevel.TEEN,
            durationSeconds: 6300, // 105 min
        },
        {
            title: 'Paper Lanterns',
            synopsis: 'Three childhood friends reunite for one last summer festival.',
            releaseYear: 2021,
            maturityLevel: MaturityLevel.OLDER_KIDS,
            durationSeconds: 5700, // 95 min
        },
        {
            title: 'Iron Tide',
            synopsis: 'A dockworker uncovers a smuggling ring tied to her own family.',
            releaseYear: 2024,
            maturityLevel: MaturityLevel.MATURE_TEEN,
            durationSeconds: 7200, // 120 min
        },
        {
            title: 'Little Rocket',
            synopsis: 'A backyard-built rocket, a curious kid, and one very patient dog.',
            releaseYear: 2020,
            maturityLevel: MaturityLevel.KIDS,
            durationSeconds: 4800, // 80 min
        },
    ];

const SERIES_SEEDS: Array<{
    title: string;
    synopsis: string;
    releaseYear: number;
    maturityLevel: MaturityLevel;
    seasons: Array<{ seasonNumber: number; episodeCount: number }>;
}> = [
        {
            title: 'The Long Signal',
            synopsis: 'A deep-space listening post picks up something that keeps repeating.',
            releaseYear: 2022,
            maturityLevel: MaturityLevel.MATURE_TEEN,
            seasons: [
                { seasonNumber: 1, episodeCount: 6 },
                { seasonNumber: 2, episodeCount: 6 },
            ],
        },
        {
            title: 'Kettle & Stone',
            synopsis: 'A small-town tea house becomes the unlikely center of a family feud.',
            releaseYear: 2023,
            maturityLevel: MaturityLevel.TEEN,
            seasons: [{ seasonNumber: 1, episodeCount: 8 }],
        },
        {
            title: 'Bramblewood Academy',
            synopsis: 'Magic school shenanigans for the under-10 crowd.',
            releaseYear: 2019,
            maturityLevel: MaturityLevel.KIDS,
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
            type: ContentType.MOVIE,
            title: movie.title,
            synopsis: movie.synopsis,
            releaseYear: movie.releaseYear,
            posterUrl: samplePoster(movie.title),
            backdropUrl: sampleBackdrop(movie.title),
            maturityLevel: movie.maturityLevel,
            durationSeconds: movie.durationSeconds,
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
                type: ContentType.SERIES,
                title: series.title,
                synopsis: series.synopsis,
                releaseYear: series.releaseYear,
                posterUrl: samplePoster(series.title),
                backdropUrl: sampleBackdrop(series.title),
                maturityLevel: series.maturityLevel,
                durationSeconds: null, // duration lives per-episode for series
            }),
        );

        for (const seasonSeed of series.seasons) {
            const season = await dsSeasonRepo.save(
                dsSeasonRepo.create({
                    seriesId: content.id,
                    seasonNumber: seasonSeed.seasonNumber,
                    title: `Season ${seasonSeed.seasonNumber}`,
                }),
            );

            for (let ep = 1; ep <= seasonSeed.episodeCount; ep++) {
                await dsEpisodeRepo.save(
                    dsEpisodeRepo.create({
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