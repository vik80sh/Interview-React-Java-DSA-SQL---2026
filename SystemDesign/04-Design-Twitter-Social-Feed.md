# Design Twitter (Social Feed)

This file follows the [7-step template from 01-System-Design-Fundamentals.md](01-System-Design-Fundamentals.md#1-the-reusable-interview-template) exactly — every scenario file in this folder does. Twitter (or any social feed — Instagram, a LinkedIn feed) is the canonical "social feed" prompt, and its hard problem is the same one every feed-based product eventually has to solve: generating a personalized, sorted feed for millions of users without recomputing it from scratch on every page load.

## 1. Clarify Requirements

**Functional:** post a tweet, follow/unfollow, view a home timeline (tweets from people you follow, newest first), like/retweet, search tweets.

**Non-functional (the ones worth asking about, not assuming):** How many users, and what's the read/write ratio? (Real answer: overwhelmingly read-heavy — people check their feed far more often than they post.) What's an acceptable feed-load latency? (Sub-200ms is the realistic bar users expect.) Does the feed need to be perfectly real-time, or is a few seconds of staleness acceptable? (Acceptable — this single answer is what justifies most of the design below.)

## 2. Estimate Scale

- 300M DAU (Daily Active Users — how many unique users actually open the app on a given day, the standard starting point for every capacity estimate), averaging 1 post per user per day → 300M posts/day.
- Reads dominate: assume ~100 feed-refresh reads per user per day → 300M × 100 / 86,400 ≈ 347,000 QPS (Queries Per Second — requests the system must handle every second) reads, vs. 300M / 86,400 ≈ 3,500 QPS writes. That's roughly a 100:1 read-to-write ratio — the number that justifies caching almost everything.
- Storage: a tweet is small (~280 bytes text + ~100 bytes metadata) — 300M/day × 380 bytes ≈ 114 GB/day, ~42 TB/year before media. Media (images/video) dominates actual storage and is handled by object storage + CDN, not the primary database.

## 3. Core API and Data Model

```text
POST /tweets            {content}                    → tweet_id
POST /follow/{userId}                                 → success
GET  /timeline?cursor=  → [{tweet_id, user_id, content, created_at}, ...]
```

```sql
users(user_id PK, username, bio, created_at)
tweets(tweet_id PK, user_id FK, content, created_at, like_count, retweet_count)
followers(follower_id, followee_id, PRIMARY KEY(follower_id, followee_id))
```

`like_count`/`retweet_count` are denormalized directly onto the tweet — exactly the trade-off explained in the [Database Design guide](03-Database-Design.md#2-schema-design-for-scale--worked-example-a-social-feed) — because a tweet is read far more often than it's liked.

## 4. High-Level Architecture

```text
Client → CDN (media) → Load Balancer → Web/API servers → Cache (Redis) → Database (primary + read replicas)
                                             │
                                             ├─→ Message Queue → Feed Fan-out Workers
                                             ├─→ Search Index (Elasticsearch)
                                             └─→ Object Storage (S3) for images/video
```

Stateless web servers behind a load balancer handle the API; a message queue decouples the expensive "notify every follower" work from the fast path of accepting a post; Elasticsearch serves full-text search independently of the primary transactional path; media never touches the primary database at all.

## 5. Deep Dive: Feed Generation — the Actual Hard Problem

This is the one part of this system genuinely worth spending interview time on.

**Pull model (compute on read):** when a user opens their timeline, query tweets from everyone they follow, merge, sort, return the top 20. Simple and always fresh, but a user following 1,000 accounts means querying and merging 1,000 people's tweets on every single feed load — far too slow at real scale.

**Push model (precompute on write):** when a user posts, immediately push that tweet into a precomputed feed list for every one of their followers (`feed:user:123` in Redis, a bounded list of recent tweet IDs). Reading a timeline becomes a single, instant cache lookup. The cost moves to write time — but write time is where a *celebrity* account breaks the model: a post from an account with 50M followers means 50M feed-list updates for one tweet, which can't complete fast enough to feel instant even with a queue absorbing the burst.

**The hybrid (what real systems actually do):** push for ordinary accounts (below some follower-count threshold), pull for celebrity accounts — a user's final timeline is the merge of "their precomputed pushed feed" plus "a live pull from the small number of celebrities they follow." This is the answer that shows you've actually thought about the failure mode of the "obvious" push-everywhere design, not just described it.

```text
Reading a timeline:
  1. Read feed:user:123 from Redis (pushed tweets from normal accounts) — instant
  2. Live-query the handful of celebrity accounts this user follows — a small, bounded query
  3. Merge both by timestamp, return top 20
```

## 6. Frontend Perspective

- **Rendering strategy:** the timeline itself is CSR — it's authenticated, per-user, and constantly changing, so there's no SEO benefit to server-rendering it. A shared public profile page or a single tweet's permalink (the kind of thing shared as a link and indexed by search engines) is a better SSR/SSG candidate, since that content is public and largely static between visits.
- **Real-time updates:** a full WebSocket connection per user for every new tweet is heavier than this actually needs — most real feed products instead poll for "new tweets available" every 15-30 seconds, or use a lightweight Server-Sent Events channel to push a "N new posts" banner, and only fetch the actual content on demand when the user pulls-to-refresh or clicks the banner. Reserve a true persistent WebSocket for something that genuinely needs sub-second bidirectional updates, like a live chat (see the [Chat System design](09-Design-Chat-System.md)).
- **Optimistic UI:** liking a tweet should update the UI instantly (increment the count, fill the icon) before the server confirms — the failure mode (a like silently not registering) is low-stakes, so the responsiveness is worth it, and the client reconciles or rolls back if the request eventually fails.
- **Client-side state:** the timeline itself is server-fetched/cached data (a React Query-style cache keyed by cursor/page), not global client state — see the [State Management guide](../Frontend/React/08-State-Management-Context-Redux-Zustand.md#1-usecontext-reacts-built-in-state-sharing) for why "is this server data or client state" is the first question to ask before reaching for Redux/Context.
- **Infinite scroll:** the timeline is exactly the cursor-based infinite scroll pattern — see the [Frontend System Design Scenarios guide](../Frontend/React/13-Frontend-System-Design-Scenarios.md#7-infinite-scroll-and-search-over-a-large-changing-dataset) for the cursor-vs-offset reasoning, which matters even more here since new tweets are constantly being inserted ahead of whatever the user has already scrolled past.

## 7. Bottlenecks and Trade-offs

- **Database writes** (3,500 QPS) — comfortably within a single well-tuned primary's capacity; not actually the bottleneck here.
- **Database reads** (347,000 QPS) — solved almost entirely by caching precomputed feeds; the database itself sees a small fraction of that, mostly for cache misses and the celebrity-pull path.
- **Fan-out on write for celebrity accounts** — the trade-off explicitly accepted above: those specific accounts are pulled instead of pushed, trading a slightly more expensive read for that narrow case in exchange for never blocking on a 50M-item fan-out.
- **Search** — sharded by time range in Elasticsearch, since old tweets are searched far less often and old shards can eventually be archived or dropped entirely.

## 8. Trade-off Summary

This design favors **availability and low read latency over perfect real-time freshness** — a user's feed is a few seconds old on average (bounded by fan-out queue processing time), which is an entirely acceptable trade for a system where "the feed loads instantly" matters far more to user experience than "the feed is provably up to the millisecond."

## Interview Questions and Answers

### 1. Why does the pull model fail for a normal user's feed at Twitter's scale, even though it's the simplest to implement?

**Answer:** Generating a feed on every read means querying and merging tweets from every account the user follows, live, on every single page load — for a user following hundreds or thousands of accounts, that's an expensive multi-way merge repeated for every feed refresh across hundreds of millions of users, which doesn't come close to the sub-200ms latency bar users expect.

### 2. Why does the push model break down specifically for celebrity accounts?

**Answer:** Pushing a new tweet means writing it into every follower's precomputed feed list immediately. An account with tens of millions of followers turns one post into tens of millions of writes, which can't complete fast enough to feel instant no matter how well the fan-out is parallelized — the write volume itself, not the infrastructure, is the limit.

### 3. How does the hybrid push/pull model actually solve the celebrity problem, precisely?

**Answer:** Ordinary accounts (below some follower threshold) still push, since their fan-out is small enough to be fast. Celebrity accounts are excluded from push entirely; instead, each follower's feed read live-queries the small, bounded set of celebrities they follow and merges those results with their precomputed pushed feed. The expensive operation moves from "fan out to 50M followers" to "each follower does one small extra query," which is comparatively cheap.

### 4. Why denormalize `like_count` onto the tweet instead of computing it with `COUNT(*)` on a likes table?

**Answer:** Tweets are read (displayed in feeds) far more often than they're liked, so recomputing a count via aggregation on every single display would multiply an expensive operation by the read volume. A denormalized counter, incremented on write, moves that cost to the much less frequent write path instead.

### 5. Why is Elasticsearch used for search instead of querying the primary tweet database directly?

**Answer:** Full-text, relevance-ranked search is a fundamentally different workload than the primary database's transactional read/write pattern, and a general-purpose relational or key-value store isn't built to rank text results by relevance efficiently at this volume. A dedicated search index, updated asynchronously from the primary write path, serves that workload without competing with the primary database's core traffic.

### 6. What's the actual trade-off this design makes, in one sentence?

**Answer:** It favors availability and fast, cache-backed reads over perfectly real-time consistency — a feed that's briefly a few seconds stale is an acceptable, deliberate cost in exchange for feed loads that are consistently fast regardless of how many accounts a user follows.

### 7. Why is polling or SSE usually the better choice over a full WebSocket connection for "new tweets available"?

**Answer:** A persistent bidirectional WebSocket per connected user is heavier infrastructure than a one-directional "something new exists" signal actually needs — most feed products just poll periodically or use a lightweight Server-Sent Events push for a "new posts" banner, fetching the real content only when the user acts on it. A true WebSocket is worth its cost for something that needs sub-second bidirectional exchange, like a chat message, which a feed generally doesn't.

## Revision Checklist

- [ ] Walk through all 8 template steps for Twitter unprompted, in order.
- [ ] Explain the pull vs push feed models and derive why push alone breaks for celebrity accounts.
- [ ] Explain the hybrid push/pull solution precisely enough to describe what happens on both the write path and the read path.
- [ ] Justify the denormalized like/retweet counts using the read:write ratio.
- [ ] Cover the frontend perspective explicitly: rendering strategy, real-time channel choice, optimistic UI, and cursor-based infinite scroll.
- [ ] State this design's core trade-off in one clear sentence.
