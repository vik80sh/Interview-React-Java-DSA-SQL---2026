# Design Netflix (Video Streaming Platform)

Same [7-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template) as every other file here. Netflix (or YouTube, or Disney+ — any video-on-demand platform) has two genuinely hard problems, not one: getting a huge video file to a user's device smoothly regardless of their network, and figuring out what to recommend from a catalog too large to browse manually.

## 1. Clarify Requirements

**Functional:** browse/search a catalog, play a video with smooth playback across varying network conditions, resume where you left off, get personalized recommendations, manage a subscription.

**Non-functional:** How many concurrent viewers at peak, and are they global? (Yes — this single answer is what makes a CDN (Content Delivery Network — a network of servers caching content physically close to users, covered in the [Scalability guide](02-Scalability-Load-Balancing.md#2-content-delivery-networks-cdns--moving-data-physically-closer-to-users)) non-negotiable rather than optional.) What's the acceptable video start time? (Under ~1-2 seconds is the real bar.) Does playback need to adapt to a user's changing network quality mid-stream? (Yes — this is what makes adaptive bitrate streaming the actual point of the deep dive, not just "store the video somewhere.")

## 2. Estimate Scale

- 200M total users, ~50M DAU (Daily Active Users — unique users opening the app on a given day), up to 1M concurrent viewers at peak (a Friday-night estimate, not an average).
- Bandwidth at peak: 1M concurrent viewers × ~2 Mbps average bitrate ≈ 2,000 Gbps — a number no single data center's network egress can serve directly, which is precisely why this system cannot be designed around one central origin serving every request.
- Storage: each title stored at multiple resolutions (480p/720p/1080p/4K) and split into chunks for adaptive streaming — total original-content storage is large, but manageable centrally; what doesn't scale from a single location is *delivery*.

## 3. Core API and Data Model

```text
GET /catalog/browse?genre=       → [{title_id, name, thumbnail, ...}]
GET /video/{titleId}/manifest    → list of available quality levels + chunk URLs
GET /video/{titleId}/chunk/{n}   → the actual video segment (served from the CDN, not the app server)
POST /video/{titleId}/progress   → {position} — for resume-where-you-left-off
```

```sql
titles(title_id PK, name, genre, release_year, description)
watch_history(user_id, title_id, position_seconds, updated_at, PRIMARY KEY(user_id, title_id))
```

The video *bytes* themselves are never modeled as a database row — they live in object storage (S3) and are served through the CDN; the database only tracks metadata and watch progress.

## 4. High-Level Architecture

```text
                          ┌─→ CDN Edge (regional) ─→ cached video chunks ─→ User
Origin (S3, transcoded) ──┤
                          └─→ [cache miss] fetches from origin, then caches for next time

User → API servers → Metadata DB (titles, watch history)
                   → Recommendation service (precomputed, served from cache)
                   → Search (Elasticsearch)
```

Video delivery and the metadata/API path are architecturally almost entirely separate systems — this separation is itself worth stating explicitly, since it's what lets each half scale independently.

## 5. Deep Dive 1: Adaptive Bitrate Streaming — Smooth Playback on Any Network

A video isn't stored or streamed as one file. It's transcoded into multiple quality levels (480p/720p/1080p/4K) and split into short chunks (typically 2-10 seconds each). The client's player continuously measures its own current download speed and requests the *next* chunk at whichever quality level that speed can sustain — this is HTTP Live Streaming (HLS) or MPEG-DASH, and it's what makes video quality drop smoothly when a network gets worse instead of the video freezing to rebuffer.

```text
Player logic (simplified):
  measure recent download speed for the last chunk
  if speed comfortably supports 1080p → request next chunk at 1080p
  if speed drops → request next chunk at 720p or lower
  (each chunk is requested independently, so quality can change chunk-to-chunk)
```

**Why chunking specifically, not just multiple full-file qualities:** if the whole video were one file per quality level, switching quality mid-playback would mean restarting the download from a completely different file at a potentially unrelated byte offset. Short, independently-requestable chunks let the client switch quality on the very next chunk boundary, seconds into the future, without any discontinuity the viewer would notice.

## 6. Deep Dive 2: The Recommendation System

**Collaborative filtering:** find users with similar watch history to the current user, and recommend what those similar users watched that this user hasn't yet. Implemented via matrix factorization — a "user embedding" and a "title embedding," where the dot product of the two approximates how much that user would like that title.

**Content-based filtering:** recommend titles similar to what a user already watched, based on the titles' own attributes (genre, cast, director) rather than other users' behavior — this is what still works for a brand-new user with no watch history yet (collaborative filtering has nothing to compare them against).

**Why both, combined:** collaborative filtering finds genuinely surprising, cross-genre recommendations ("people who liked X also liked this unrelated-seeming Y"), while content-based filtering handles the cold-start problem for new users and new titles that don't have enough interaction data yet for collaborative filtering to work well. Real systems blend both, and this — not the modeling detail of either individually — is the actual interview-relevant insight.

**Serving at scale:** recommendations are computed **offline**, in a daily or hourly batch job, and the pre-computed top-N results per user are stored in a fast cache — the app never computes a recommendation live during a page load, because scoring the full catalog against a user's profile in real time, for every single homepage visit, would never hit the latency bar.

## 7. Frontend Perspective

- **Rendering strategy:** the catalog browse/landing pages benefit from SSR or SSG (they're largely the same for every visitor and unauthenticated users can land on them — real SEO value), while the actual "continue watching" row and the player screen itself are CSR/client-fetched, since they're per-user and depend on live watch-progress state. See the [SSR/CSR/Next.js guide](../Frontend/React/11-SSR-CSR-and-Nextjs.md) for this exact split reasoning applied generally.
- **The player itself is the real frontend complexity here:** it owns the adaptive-bitrate logic from the deep dive above — measuring throughput, choosing the next chunk's quality, and buffering ahead — via the Media Source Extensions API or a library (hls.js, dash.js) wrapping it. This is meaningfully more frontend logic than most system design answers acknowledge.
- **Real-time channel:** none needed for playback itself (chunk requests are plain HTTP), but a lightweight channel (or simple polling) is useful for syncing watch progress across a user's multiple devices, so pausing on a phone and resuming on a TV picks up close to the right spot.
- **Optimistic UI:** "add to my list" / thumbs up-down should update instantly client-side and sync in the background — there's no reason to block that interaction on a round trip.
- **Client-side state and caching:** the catalog/browse data is server-fetched and cacheable (React Query-style, since it changes infrequently); watch progress is small, frequently-updated per-user state, best treated as its own lightweight synced state rather than mixed into the catalog cache.
- **Failure handling:** the player must handle a stalled/failed chunk request by falling back to a lower quality or retrying, not just freezing — from the user's perspective, a visible quality drop is a far better failure mode than a frozen screen.

## 8. Bottlenecks and Trade-offs

- **Global video delivery bandwidth** — solved by pushing delivery to CDN edge locations near users, so the enormous aggregate bandwidth is distributed across many regional points of presence instead of one origin's network link.
- **Recommendation freshness vs cost** — precomputing recommendations means they're always slightly stale (yesterday's batch run), traded deliberately against the alternative of scoring live, which is both far slower and far more expensive to run per-request.
- **New content/cold start** — a brand-new title or user has no interaction history for collaborative filtering to use, which is exactly why content-based filtering exists as a fallback rather than a redundant nicety.

## 9. Trade-off Summary

This design favors **delivery locality and precomputation over real-time freshness** in both of its hard problems — video is fetched from a nearby cache rather than a single global origin, and recommendations are computed ahead of time rather than live — because in both cases, a small amount of staleness (a cached chunk, a day-old recommendation ranking) is invisible or nearly invisible to the user, while the alternative (always-live, always-central) simply cannot meet the latency and bandwidth bar at this scale.

## Interview Questions and Answers

### 1. Why can't Netflix serve video from a single central data center, even one with enormous bandwidth?

**Answer:** Aggregate bandwidth at peak (millions of concurrent viewers × multiple Mbps each) reaches into the terabits-per-second range, which no single network link can carry, and the physical distance from a central location to a global user base alone adds latency that hurts start time regardless of bandwidth. Distributing delivery across many regional CDN edge locations solves both problems simultaneously — nearby servers, and the aggregate load spread across many independent network links.

### 2. Why is video split into short chunks at multiple quality levels instead of one file per quality?

**Answer:** Chunking lets the player switch quality at the next chunk boundary — seconds away — in response to changing network conditions, without restarting a download or causing a visible discontinuity. A single full-file-per-quality approach would make a mid-playback quality switch require restarting the download from an unrelated byte offset in a different file.

### 3. How does the player decide which quality chunk to request next?

**Answer:** It measures its own recent download throughput (how fast the last chunk arrived) and requests the next chunk at whichever quality level that measured bandwidth can sustain without rebuffering, adjusting up or down chunk by chunk as network conditions change.

### 4. Why combine collaborative filtering with content-based filtering instead of using just one?

**Answer:** Collaborative filtering (similar users' behavior) finds genuinely good, sometimes cross-genre recommendations, but has nothing to work with for a brand-new user or a brand-new title with no interaction history yet — the cold-start problem. Content-based filtering (a title's own attributes: genre, cast) works immediately for those cold-start cases, so combining both covers what each one alone can't.

### 5. Why are recommendations computed offline in a batch job instead of live per page load?

**Answer:** Scoring an entire catalog against a user's profile in real time, for every single homepage visit across tens of millions of daily users, would be far too slow and expensive to meet any reasonable latency bar. Precomputing a ranked list per user in a periodic batch job and serving it from a fast cache trades a small amount of staleness (recommendations reflect yesterday's data) for serving instantly.

### 6. What's the core trade-off of this design, in one sentence?

**Answer:** It trades a small, mostly invisible amount of staleness — a cached video chunk, a day-old recommendation ranking — for delivery speed and scale that a fully real-time, centralized alternative simply couldn't achieve at this volume.

### 7. What frontend responsibility does a video streaming client have that most system design answers skip over?

**Answer:** The player itself implements the adaptive bitrate logic from the deep dive — measuring its own recent download throughput and choosing the next chunk's quality level — via the Media Source Extensions API or a wrapping library like hls.js. This is real, nontrivial client-side logic, not just "the browser plays a video tag," and it's exactly the kind of detail that separates a frontend-aware system design answer from a backend-only one.

### 8. Why should the catalog/browse pages and the player screen use different rendering strategies?

**Answer:** Catalog/browse pages are largely the same for every visitor and benefit from SEO, making them good SSR/SSG candidates. The player screen and personalized rows like "continue watching" are inherently per-user and state-dependent, with no SEO value, so they're rendered client-side against live, authenticated data instead.

## Revision Checklist

- [ ] Walk through all 8 template steps for a video streaming platform unprompted.
- [ ] Explain adaptive bitrate streaming and why chunking (not just multiple quality files) is the key detail.
- [ ] Explain collaborative vs content-based filtering and the specific cold-start problem each half solves.
- [ ] Explain why recommendations are precomputed rather than scored live, and the trade-off that implies.
- [ ] Cover the frontend perspective explicitly: the player's adaptive-bitrate client logic, the SSR/CSR split between catalog and player, and graceful chunk-failure handling.
- [ ] State this design's core trade-off in one clear sentence.
