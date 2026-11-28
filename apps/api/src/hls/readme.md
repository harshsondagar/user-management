# HLS Video Streaming POC (NestJS + FFmpeg + BullMQ)

A proof of concept for **adaptive video streaming with HLS** built on NestJS. Upload a video, convert it to multiple qualities in the background, protect it with AES-128 encryption and token auth, and play it with hls.js.

## Features

- Video upload (`multipart/form-data`) with type and size validation
- Background conversion with **BullMQ + Redis** (the upload returns instantly)
- **Adaptive bitrate** output: 360p, 720p, 1080p with a `master.m3u8`
- Job status and progress endpoint (polling)
- **AES-128 encryption** of all segments
- **JWT play token** (short-lived, bound to one video) required for playlists, segments and the key
- Test player with quality selector and "now playing" indicator
- Uniform API responses: `{ "success": true, "data": { ... } }`

## How it works

```
Client                     NestJS API                 Redis          Worker (FFmpeg)
  │── POST /api/hls/upload ──►│── add job ───────────────►│               │
  │◄── { videoId, queued } ───│                           │──── job ─────►│ encode 360p/720p/1080p
  │                           │                           │               │ AES-128 encrypt
  │── GET /api/hls/status ───►│◄── progress ──────────────│◄── update ────│ write master.m3u8
  │── GET /api/hls/play-token ►│  (put your auth guard here)
  │── GET /api/stream/:id/master.m3u8 + Bearer token ────►│
  │── GET /api/keys/:id        + Bearer token ───────────►│  16-byte key
  │── GET /api/stream/:id/720p/seg_000.ts + Bearer token ►│  encrypted chunk
```

## Tech stack

| Part        | Tool                          |
| ----------- | ----------------------------- |
| Backend     | NestJS (monorepo, `apps/api`) |
| Transcoding | FFmpeg (H.264 + AAC)          |
| Queue       | BullMQ + Redis                |
| Auth        | `@nestjs/jwt`                 |
| Player      | hls.js                        |

## Project structure

```
apps/api/src/hls/
├── hls.module.ts          # registers queue, JWT, controllers, providers
├── hls.controller.ts      # upload, status, play-token
├── stream.controller.ts   # serves master/media playlists and segments (guarded)
├── key.controller.ts      # serves the AES key (guarded)
├── hls-token.guard.ts     # verifies the play token
├── hls.service.ts         # FFmpeg encoding, key and master playlist generation
├── hls.processor.ts       # BullMQ worker
└── hls.constants.ts

public/player.html         # test player
storage/                   # created at runtime (git-ignored)
├── uploads/               # temporary uploads
├── hls/<videoId>/         # master.m3u8, 360p/, 720p/, 1080p/
└── keys/<videoId>/        # enc.key, enc.keyinfo (never served as files)
```

## Prerequisites

- Node.js 18+ (LTS)
- FFmpeg with `libx264` and `aac`
- Redis 6+

### Ubuntu

```bash
sudo apt update
sudo apt install ffmpeg redis-server -y
sudo systemctl enable --now redis-server

ffmpeg -version
redis-cli ping        # PONG
```

## Setup

```bash
git clone <your-repo-url>
cd <your-repo>
npm install
cp .env.example .env
```

`.env`:

```env
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
HLS_KEY_SECRET=change-me          # generate: openssl rand -hex 32
HLS_KEY_URI_BASE=/api/keys        # URL written inside the m3u8 (include the global prefix)
```

Run:

```bash
npm run start:dev
```

Open the test player: `http://localhost:3000/player.html`

## API

All responses use `{ "success": true, "data": ... }`.

| Method | Endpoint                                   | Auth                  | Description                                                              |
| ------ | ------------------------------------------ | --------------------- | ------------------------------------------------------------------------ |
| POST   | `/api/hls/upload`                          | none (add your guard) | Upload a video (`video` field). Returns `videoId`, `status`, `statusUrl` |
| GET    | `/api/hls/status/:videoId`                 | none                  | `waiting`, `active`, `completed`, `failed` plus `progress`               |
| GET    | `/api/hls/play-token/:videoId`             | none (add your guard) | Returns a 2-hour JWT bound to the video                                  |
| GET    | `/api/stream/:videoId/master.m3u8`         | Bearer token          | Master playlist                                                          |
| GET    | `/api/stream/:videoId/:quality/index.m3u8` | Bearer token          | Media playlist                                                           |
| GET    | `/api/stream/:videoId/:quality/seg_XXX.ts` | Bearer token          | Encrypted segment                                                        |
| GET    | `/api/keys/:videoId`                       | Bearer token          | Raw 16-byte AES key (not JSON-wrapped)                                   |

Example:

```bash
# 1. Upload
curl -F "video=@input.mp4" http://localhost:3000/api/hls/upload

# 2. Poll
curl http://localhost:3000/api/hls/status/<videoId>

# 3. Token and playlist
TOKEN=$(curl -s http://localhost:3000/api/hls/play-token/<videoId> | jq -r .data.token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/stream/<videoId>/master.m3u8
```

## Conversion settings

| Quality | Resolution | Video bitrate | Audio bitrate |
| ------- | ---------- | ------------- | ------------- |
| 360p    | 640x360    | 800k          | 96k           |
| 720p    | 1280x720   | 2800k         | 128k          |
| 1080p   | 1920x1080  | 5000k         | 192k          |

- Segment length: 4 seconds
- Keyframe every 120 frames (assumes 30 fps) so all qualities cut at the same points
- One AES-128 key per video, shared by all qualities

## Verify it works

```bash
# Playlists contain the key line
head storage/hls/<videoId>/720p/index.m3u8
# #EXT-X-KEY:METHOD=AES-128,URI="/api/keys/<videoId>"

# No token -> 401
curl -i http://localhost:3000/api/stream/<videoId>/master.m3u8

# Adaptive switching: DevTools > Network > throttle to "Slow 3G"
# and watch the "Now playing" label drop to 360p
```

## Troubleshooting

| Problem                                | Fix                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Job stays in `waiting`                 | Processor not registered in `HlsModule` providers, or wrong app is running            |
| `spawn ffmpeg ENOENT`                  | FFmpeg is not on the PATH of the Node process                                         |
| `ECONNREFUSED 6379`                    | Redis is not running                                                                  |
| 401 on stream requests                 | Token missing, expired, or issued for another video                                   |
| `secretOrPrivateKey must have a value` | `HLS_KEY_SECRET` not loaded; use `JwtModule.registerAsync`                            |
| CORS errors                            | `app.enableCors({ origin: true, allowedHeaders: ['Content-Type', 'Authorization'] })` |
| Old videos will not play               | They were encoded before encryption; re-upload                                        |

## Known limitations

- The worker runs inside the API process (FFmpeg load can affect API latency)
- Upload and play-token endpoints have no login guard yet
- AES-128 HLS deters casual downloading but is **not DRM**; a viewer can still capture the key
- Safari/iOS native playback cannot send the `Authorization` header (hls.js is required)
- Storage is local disk; keys must be backed up together with the videos
- Keyframe interval assumes 30 fps sources

## Roadmap

- [x] Single-quality HLS conversion
- [x] Multi-quality adaptive streaming with master playlist
- [x] Background processing (BullMQ + Redis)
- [x] AES-128 encryption + token auth
- [ ] Live streaming (RTMP in, HLS out)
- [ ] S3 storage + CDN (signed URLs / cookies)

## License

MIT
