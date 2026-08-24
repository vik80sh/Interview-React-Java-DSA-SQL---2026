# Master Question Bank — System Design

This file aggregates every interview question and its full answer from all 11 files in this `SystemDesign` folder, in file order, so you can drill the entire folder's Q&A in one place. Each question is followed by its verbatim answer and a source link back to the exact question in its original file, for deeper context (the surrounding architecture, diagrams, and reasoning that produced that answer). All 11 files use the same explicit `## Interview Questions and Answers` section format, so nothing here is inferred or reconstructed — it's copied as written.

## [1. System Design Fundamentals](01-System-Design-Fundamentals.md)

### 1. Explain the CAP theorem, and why "choose 2 of 3" is a slight oversimplification.

**Answer:** CAP says a distributed system can't simultaneously guarantee consistency, availability, and partition tolerance. Since network partitions are a real, unavoidable fact of distributed systems, the practical choice is between CP (refuse some requests during a partition to protect consistency) and AP (keep answering, accepting temporary disagreement). It's a slight oversimplification because the choice doesn't have to be made once for the whole system — different features within the same application can make different CP/AP choices based on their own tolerance for staleness.

*Source: [01-System-Design-Fundamentals.md#1-explain-the-cap-theorem-and-why-choose-2-of-3-is-a-slight-oversimplification](01-System-Design-Fundamentals.md#1-explain-the-cap-theorem-and-why-choose-2-of-3-is-a-slight-oversimplification)*

### 2. When would you choose ACID over BASE, and vice versa?

**Answer:** ACID when a specific piece of data has a real invariant that must never be violated even under concurrent access — an account balance, an inventory count at checkout. BASE when a system needs to stay available and fast under massive horizontal scale, and the specific data involved can tolerate being briefly stale — a follower count, a view counter, a cached recommendation list.

*Source: [01-System-Design-Fundamentals.md#2-when-would-you-choose-acid-over-base-and-vice-versa](01-System-Design-Fundamentals.md#2-when-would-you-choose-acid-over-base-and-vice-versa)*

### 3. How do you estimate the QPS a system needs to handle, and why use peak instead of average?

**Answer:** Multiply daily active users by actions per user per day, divide by seconds in a day to get average QPS, then multiply by a peak factor (commonly 2-3x) to account for non-uniform traffic across the day. A system sized for the average will fail exactly when it matters most — during the actual peak — so real capacity planning targets peak QPS with an additional safety margin, not the average.

*Source: [01-System-Design-Fundamentals.md#3-how-do-you-estimate-the-qps-a-system-needs-to-handle-and-why-use-peak-instead-of-average](01-System-Design-Fundamentals.md#3-how-do-you-estimate-the-qps-a-system-needs-to-handle-and-why-use-peak-instead-of-average)*

### 4. Vertical vs horizontal scaling — how do you decide which to reach for first?

**Answer:** Vertical scaling first for anything stateful and hard to distribute, like a single database, because it's simpler and has no coordination cost, up until its ceiling. Horizontal scaling for anything stateless that needs to scale further than one machine can handle, like web/API servers, since the coordination cost (load balancing, no shared local state) is manageable and the benefit (near-unlimited scaling, no single point of failure) is worth it early.

*Source: [01-System-Design-Fundamentals.md#4-vertical-vs-horizontal-scaling-how-do-you-decide-which-to-reach-for-first](01-System-Design-Fundamentals.md#4-vertical-vs-horizontal-scaling-how-do-you-decide-which-to-reach-for-first)*

### 5. Why does the "right" trade-off between consistency, availability, and latency depend entirely on the system?

**Answer:** Each of the three costs something different, and different systems have genuinely different tolerances for those costs — a bank cannot tolerate inconsistent balances even briefly, while a social feed can tolerate a few seconds of staleness far more easily than it can tolerate being unavailable. There's no universally "correct" choice; there's only the choice that matches what the specific system's users actually need.

*Source: [01-System-Design-Fundamentals.md#5-why-does-the-right-trade-off-between-consistency-availability-and-latency-depend-entirely-on-the-system](01-System-Design-Fundamentals.md#5-why-does-the-right-trade-off-between-consistency-availability-and-latency-depend-entirely-on-the-system)*

### 6. What's the first thing you should do when given an open-ended "design X" prompt?

**Answer:** Ask clarifying questions to pin down functional and non-functional requirements — scale, latency expectations, consistency needs, and which features actually matter for this conversation — before drawing anything. Designing before clarifying risks spending the whole interview solving a version of the problem the interviewer didn't actually ask about.

*Source: [01-System-Design-Fundamentals.md#6-whats-the-first-thing-you-should-do-when-given-an-open-ended-design-x-prompt](01-System-Design-Fundamentals.md#6-whats-the-first-thing-you-should-do-when-given-an-open-ended-design-x-prompt)*

## [2. Scalability and Load Balancing](02-Scalability-Load-Balancing.md)

### 1. Why is Layer 7 load balancing generally preferred over Layer 4 despite the extra overhead?

**Answer:** Layer 7 can read the actual HTTP request content — path, headers, cookies — and route intelligently based on it (different services per path, session-aware routing, A/B testing by header), which Layer 4's IP-and-port-only view can't do at all. The small extra processing cost is almost always worth the routing flexibility it buys.

*Source: [02-Scalability-Load-Balancing.md#1-why-is-layer-7-load-balancing-generally-preferred-over-layer-4-despite-the-extra-overhead](02-Scalability-Load-Balancing.md#1-why-is-layer-7-load-balancing-generally-preferred-over-layer-4-despite-the-extra-overhead)*

### 2. What problem do sticky sessions create, and what's the real fix?

**Answer:** If session data lives only in one server's local memory, that user must always be routed back to that exact server, which breaks if the server fails and complicates draining a server for maintenance. The real fix is removing session state from individual servers entirely — a shared store like Redis, or a self-contained signed token like a JWT — so every server is stateless and any of them can serve any request.

*Source: [02-Scalability-Load-Balancing.md#2-what-problem-do-sticky-sessions-create-and-whats-the-real-fix](02-Scalability-Load-Balancing.md#2-what-problem-do-sticky-sessions-create-and-whats-the-real-fix)*

### 3. What's replication lag, and what real bug does it cause?

**Answer:** It's the delay between a write landing on the primary database and that write propagating to a read replica. The real bug: a user who just wrote data and immediately reads it back can hit a replica that hasn't caught up yet, making their own write appear to have vanished — fixed by routing that specific read back to the primary, not by trying to eliminate replication lag entirely.

*Source: [02-Scalability-Load-Balancing.md#3-whats-replication-lag-and-what-real-bug-does-it-cause](02-Scalability-Load-Balancing.md#3-whats-replication-lag-and-what-real-bug-does-it-cause)*

### 4. What's the real difference between replication and sharding, and when do you need each?

**Answer:** Replication copies the same full dataset to multiple machines, scaling read throughput and adding failure redundancy. Sharding splits the dataset into disjoint pieces across multiple machines, scaling write throughput because different shards can be written to in parallel. Most systems add read replicas first (cheaper, simpler) and only shard once write throughput itself — not just read throughput — becomes the bottleneck.

*Source: [02-Scalability-Load-Balancing.md#4-whats-the-real-difference-between-replication-and-sharding-and-when-do-you-need-each](02-Scalability-Load-Balancing.md#4-whats-the-real-difference-between-replication-and-sharding-and-when-do-you-need-each)*

### 5. Why does the choice of shard key matter so much, and what's the real cost of getting it wrong?

**Answer:** The shard key determines which queries stay fast (anything scoped to one shard's key) and which become expensive (anything that has to query and merge results across every shard). Getting it wrong doesn't just mean slower queries — cross-shard joins and multi-shard transactions become genuinely hard to support correctly at all, so the choice is close to irreversible without a real data migration.

*Source: [02-Scalability-Load-Balancing.md#5-why-does-the-choice-of-shard-key-matter-so-much-and-whats-the-real-cost-of-getting-it-wrong](02-Scalability-Load-Balancing.md#5-why-does-the-choice-of-shard-key-matter-so-much-and-whats-the-real-cost-of-getting-it-wrong)*

### 6. Why is consistent hashing preferred over plain modulo hashing for shard assignment?

**Answer:** With plain modulo (`hash(key) % N`), adding or removing a single shard changes the modulo result for almost every key, forcing a near-total data reshuffle. Consistent hashing assigns keys to positions on a hash ring such that adding or removing a shard only moves the keys that specifically fall into the changed portion of the ring, making re-sharding a much smaller, more tractable operation.

*Source: [02-Scalability-Load-Balancing.md#6-why-is-consistent-hashing-preferred-over-plain-modulo-hashing-for-shard-assignment](02-Scalability-Load-Balancing.md#6-why-is-consistent-hashing-preferred-over-plain-modulo-hashing-for-shard-assignment)*

## [3. Database Design for System Design Interviews](03-Database-Design.md)

### 1. How do you actually decide between a relational and a document database for a new system, without just picking a favorite?

**Answer:** Ask whether the data has real cross-entity relationships/invariants that need enforcing (favors relational), and whether individual records' shape varies a lot or evolves unpredictably (favors document). A system with strict relational integrity needs (orders, payments, inventory) points toward relational regardless of scale; a system with wildly varying per-record attributes (a multi-category product catalog) points toward a document store even at modest scale.

*Source: [03-Database-Design.md#1-how-do-you-actually-decide-between-a-relational-and-a-document-database-for-a-new-system-without-just-picking-a-favorite](03-Database-Design.md#1-how-do-you-actually-decide-between-a-relational-and-a-document-database-for-a-new-system-without-just-picking-a-favorite)*

### 2. Why would you denormalize a like-count directly onto a post instead of always computing `COUNT(*)` on the likes table?

**Answer:** Posts are read far more often than they're liked, so a `COUNT(*)` aggregation on every single read multiplies an expensive operation by the read volume. Storing a running counter on the post itself moves that cost to write time (a small increment per like) instead of read time, which is the correct trade for a read-to-write ratio this skewed.

*Source: [03-Database-Design.md#2-why-would-you-denormalize-a-like-count-directly-onto-a-post-instead-of-always-computing-count-on-the-likes-table](03-Database-Design.md#2-why-would-you-denormalize-a-like-count-directly-onto-a-post-instead-of-always-computing-count-on-the-likes-table)*

### 3. What's the real risk of embedding a "reviews" array directly inside a product document in MongoDB?

**Answer:** Embedding works fine while the array stays small, but a popular product can accumulate thousands of reviews, and every read of that product then loads the entire array along with it — and MongoDB documents have a hard size ceiling that an ever-growing embedded array can eventually hit. The fix is embedding only a small summary (average rating, count) and referencing the full review list as its own paginated collection.

*Source: [03-Database-Design.md#3-whats-the-real-risk-of-embedding-a-reviews-array-directly-inside-a-product-document-in-mongodb](03-Database-Design.md#3-whats-the-real-risk-of-embedding-a-reviews-array-directly-inside-a-product-document-in-mongodb)*

### 4. What actually distinguishes a read-heavy system's scaling strategy from a write-heavy system's?

**Answer:** Read-heavy systems push cost from read time to write time or a background job — caching, read replicas, precomputed aggregations — because reads happen far more often and that's where the multiplier lives. Write-heavy systems instead need to absorb write bursts (a message queue), batch writes, and often a storage engine purpose-built for write throughput, because the bottleneck is the sheer rate of incoming writes, not the cost of any single read.

*Source: [03-Database-Design.md#4-what-actually-distinguishes-a-read-heavy-systems-scaling-strategy-from-a-write-heavy-systems](03-Database-Design.md#4-what-actually-distinguishes-a-read-heavy-systems-scaling-strategy-from-a-write-heavy-systems)*

### 5. Why doesn't a single `posts(created_at)` index solve "generate my home feed"?

**Answer:** A global time-sorted index answers "what's newest across everyone," not "what's newest among the specific people I follow" — those are different queries with very different cost profiles once the follow graph is large. Real feed systems precompute a per-user feed ahead of time (a push/fan-out model) rather than trying to satisfy the personalized query directly against a single shared index at read time.

*Source: [03-Database-Design.md#5-why-doesnt-a-single-postscreated_at-index-solve-generate-my-home-feed](03-Database-Design.md#5-why-doesnt-a-single-postscreated_at-index-solve-generate-my-home-feed)*

## [4. Design Twitter (Social Feed)](04-Design-Twitter-Social-Feed.md)

### 1. Why does the pull model fail for a normal user's feed at Twitter's scale, even though it's the simplest to implement?

**Answer:** Generating a feed on every read means querying and merging tweets from every account the user follows, live, on every single page load — for a user following hundreds or thousands of accounts, that's an expensive multi-way merge repeated for every feed refresh across hundreds of millions of users, which doesn't come close to the sub-200ms latency bar users expect.

*Source: [04-Design-Twitter-Social-Feed.md#1-why-does-the-pull-model-fail-for-a-normal-users-feed-at-twitters-scale-even-though-its-the-simplest-to-implement](04-Design-Twitter-Social-Feed.md#1-why-does-the-pull-model-fail-for-a-normal-users-feed-at-twitters-scale-even-though-its-the-simplest-to-implement)*

### 2. Why does the push model break down specifically for celebrity accounts?

**Answer:** Pushing a new tweet means writing it into every follower's precomputed feed list immediately. An account with tens of millions of followers turns one post into tens of millions of writes, which can't complete fast enough to feel instant no matter how well the fan-out is parallelized — the write volume itself, not the infrastructure, is the limit.

*Source: [04-Design-Twitter-Social-Feed.md#2-why-does-the-push-model-break-down-specifically-for-celebrity-accounts](04-Design-Twitter-Social-Feed.md#2-why-does-the-push-model-break-down-specifically-for-celebrity-accounts)*

### 3. How does the hybrid push/pull model actually solve the celebrity problem, precisely?

**Answer:** Ordinary accounts (below some follower threshold) still push, since their fan-out is small enough to be fast. Celebrity accounts are excluded from push entirely; instead, each follower's feed read live-queries the small, bounded set of celebrities they follow and merges those results with their precomputed pushed feed. The expensive operation moves from "fan out to 50M followers" to "each follower does one small extra query," which is comparatively cheap.

*Source: [04-Design-Twitter-Social-Feed.md#3-how-does-the-hybrid-pushpull-model-actually-solve-the-celebrity-problem-precisely](04-Design-Twitter-Social-Feed.md#3-how-does-the-hybrid-pushpull-model-actually-solve-the-celebrity-problem-precisely)*

### 4. Why denormalize `like_count` onto the tweet instead of computing it with `COUNT(*)` on a likes table?

**Answer:** Tweets are read (displayed in feeds) far more often than they're liked, so recomputing a count via aggregation on every single display would multiply an expensive operation by the read volume. A denormalized counter, incremented on write, moves that cost to the much less frequent write path instead.

*Source: [04-Design-Twitter-Social-Feed.md#4-why-denormalize-like_count-onto-the-tweet-instead-of-computing-it-with-count-on-a-likes-table](04-Design-Twitter-Social-Feed.md#4-why-denormalize-like_count-onto-the-tweet-instead-of-computing-it-with-count-on-a-likes-table)*

### 5. Why is Elasticsearch used for search instead of querying the primary tweet database directly?

**Answer:** Full-text, relevance-ranked search is a fundamentally different workload than the primary database's transactional read/write pattern, and a general-purpose relational or key-value store isn't built to rank text results by relevance efficiently at this volume. A dedicated search index, updated asynchronously from the primary write path, serves that workload without competing with the primary database's core traffic.

*Source: [04-Design-Twitter-Social-Feed.md#5-why-is-elasticsearch-used-for-search-instead-of-querying-the-primary-tweet-database-directly](04-Design-Twitter-Social-Feed.md#5-why-is-elasticsearch-used-for-search-instead-of-querying-the-primary-tweet-database-directly)*

### 6. What's the actual trade-off this design makes, in one sentence?

**Answer:** It favors availability and fast, cache-backed reads over perfectly real-time consistency — a feed that's briefly a few seconds stale is an acceptable, deliberate cost in exchange for feed loads that are consistently fast regardless of how many accounts a user follows.

*Source: [04-Design-Twitter-Social-Feed.md#6-whats-the-actual-trade-off-this-design-makes-in-one-sentence](04-Design-Twitter-Social-Feed.md#6-whats-the-actual-trade-off-this-design-makes-in-one-sentence)*

### 7. Why is polling or SSE usually the better choice over a full WebSocket connection for "new tweets available"?

**Answer:** A persistent bidirectional WebSocket per connected user is heavier infrastructure than a one-directional "something new exists" signal actually needs — most feed products just poll periodically or use a lightweight Server-Sent Events push for a "new posts" banner, fetching the real content only when the user acts on it. A true WebSocket is worth its cost for something that needs sub-second bidirectional exchange, like a chat message, which a feed generally doesn't.

*Source: [04-Design-Twitter-Social-Feed.md#7-why-is-polling-or-sse-usually-the-better-choice-over-a-full-websocket-connection-for-new-tweets-available](04-Design-Twitter-Social-Feed.md#7-why-is-polling-or-sse-usually-the-better-choice-over-a-full-websocket-connection-for-new-tweets-available)*

## [5. Design Netflix (Video Streaming Platform)](05-Design-Netflix-Video-Streaming.md)

### 1. Why can't Netflix serve video from a single central data center, even one with enormous bandwidth?

**Answer:** Aggregate bandwidth at peak (millions of concurrent viewers × multiple Mbps each) reaches into the terabits-per-second range, which no single network link can carry, and the physical distance from a central location to a global user base alone adds latency that hurts start time regardless of bandwidth. Distributing delivery across many regional CDN edge locations solves both problems simultaneously — nearby servers, and the aggregate load spread across many independent network links.

*Source: [05-Design-Netflix-Video-Streaming.md#1-why-cant-netflix-serve-video-from-a-single-central-data-center-even-one-with-enormous-bandwidth](05-Design-Netflix-Video-Streaming.md#1-why-cant-netflix-serve-video-from-a-single-central-data-center-even-one-with-enormous-bandwidth)*

### 2. Why is video split into short chunks at multiple quality levels instead of one file per quality?

**Answer:** Chunking lets the player switch quality at the next chunk boundary — seconds away — in response to changing network conditions, without restarting a download or causing a visible discontinuity. A single full-file-per-quality approach would make a mid-playback quality switch require restarting the download from an unrelated byte offset in a different file.

*Source: [05-Design-Netflix-Video-Streaming.md#2-why-is-video-split-into-short-chunks-at-multiple-quality-levels-instead-of-one-file-per-quality](05-Design-Netflix-Video-Streaming.md#2-why-is-video-split-into-short-chunks-at-multiple-quality-levels-instead-of-one-file-per-quality)*

### 3. How does the player decide which quality chunk to request next?

**Answer:** It measures its own recent download throughput (how fast the last chunk arrived) and requests the next chunk at whichever quality level that measured bandwidth can sustain without rebuffering, adjusting up or down chunk by chunk as network conditions change.

*Source: [05-Design-Netflix-Video-Streaming.md#3-how-does-the-player-decide-which-quality-chunk-to-request-next](05-Design-Netflix-Video-Streaming.md#3-how-does-the-player-decide-which-quality-chunk-to-request-next)*

### 4. Why combine collaborative filtering with content-based filtering instead of using just one?

**Answer:** Collaborative filtering (similar users' behavior) finds genuinely good, sometimes cross-genre recommendations, but has nothing to work with for a brand-new user or a brand-new title with no interaction history yet — the cold-start problem. Content-based filtering (a title's own attributes: genre, cast) works immediately for those cold-start cases, so combining both covers what each one alone can't.

*Source: [05-Design-Netflix-Video-Streaming.md#4-why-combine-collaborative-filtering-with-content-based-filtering-instead-of-using-just-one](05-Design-Netflix-Video-Streaming.md#4-why-combine-collaborative-filtering-with-content-based-filtering-instead-of-using-just-one)*

### 5. Why are recommendations computed offline in a batch job instead of live per page load?

**Answer:** Scoring an entire catalog against a user's profile in real time, for every single homepage visit across tens of millions of daily users, would be far too slow and expensive to meet any reasonable latency bar. Precomputing a ranked list per user in a periodic batch job and serving it from a fast cache trades a small amount of staleness (recommendations reflect yesterday's data) for serving instantly.

*Source: [05-Design-Netflix-Video-Streaming.md#5-why-are-recommendations-computed-offline-in-a-batch-job-instead-of-live-per-page-load](05-Design-Netflix-Video-Streaming.md#5-why-are-recommendations-computed-offline-in-a-batch-job-instead-of-live-per-page-load)*

### 6. What's the core trade-off of this design, in one sentence?

**Answer:** It trades a small, mostly invisible amount of staleness — a cached video chunk, a day-old recommendation ranking — for delivery speed and scale that a fully real-time, centralized alternative simply couldn't achieve at this volume.

*Source: [05-Design-Netflix-Video-Streaming.md#6-whats-the-core-trade-off-of-this-design-in-one-sentence](05-Design-Netflix-Video-Streaming.md#6-whats-the-core-trade-off-of-this-design-in-one-sentence)*

### 7. What frontend responsibility does a video streaming client have that most system design answers skip over?

**Answer:** The player itself implements the adaptive bitrate logic from the deep dive — measuring its own recent download throughput and choosing the next chunk's quality level — via the Media Source Extensions API or a wrapping library like hls.js. This is real, nontrivial client-side logic, not just "the browser plays a video tag," and it's exactly the kind of detail that separates a frontend-aware system design answer from a backend-only one.

*Source: [05-Design-Netflix-Video-Streaming.md#7-what-frontend-responsibility-does-a-video-streaming-client-have-that-most-system-design-answers-skip-over](05-Design-Netflix-Video-Streaming.md#7-what-frontend-responsibility-does-a-video-streaming-client-have-that-most-system-design-answers-skip-over)*

### 8. Why should the catalog/browse pages and the player screen use different rendering strategies?

**Answer:** Catalog/browse pages are largely the same for every visitor and benefit from SEO, making them good SSR/SSG candidates. The player screen and personalized rows like "continue watching" are inherently per-user and state-dependent, with no SEO value, so they're rendered client-side against live, authenticated data instead.

*Source: [05-Design-Netflix-Video-Streaming.md#8-why-should-the-catalogbrowse-pages-and-the-player-screen-use-different-rendering-strategies](05-Design-Netflix-Video-Streaming.md#8-why-should-the-catalogbrowse-pages-and-the-player-screen-use-different-rendering-strategies)*

## [6. Design Uber / Ola (Ride-Hailing)](06-Design-Uber-Ride-Hailing.md)

### 1. Why does driver location get stored in Redis instead of the primary relational database?

**Answer:** Location updates arrive at extremely high volume (millions per second across a large driver fleet) and each individual update has very low durability requirements — losing one stale GPS ping is a non-event since another arrives in a few seconds. A relational database's transactional write path isn't built for that volume/durability trade-off; an in-memory geospatial store is exactly the right tool, while ride and payment data still need the relational database's transactional guarantees.

*Source: [06-Design-Uber-Ride-Hailing.md#1-why-does-driver-location-get-stored-in-redis-instead-of-the-primary-relational-database](06-Design-Uber-Ride-Hailing.md#1-why-does-driver-location-get-stored-in-redis-instead-of-the-primary-relational-database)*

### 2. What does geohashing actually buy the matching system?

**Answer:** It encodes geographic coordinates so that nearby locations share a common string prefix, letting a "find everything within X km" query narrow down to a small set of grid cells first instead of computing an exact distance against every single driver's raw coordinates. This is what keeps a radius search fast even as the number of active drivers grows into the millions.

*Source: [06-Design-Uber-Ride-Hailing.md#2-what-does-geohashing-actually-buy-the-matching-system](06-Design-Uber-Ride-Hailing.md#2-what-does-geohashing-actually-buy-the-matching-system)*

### 3. Why doesn't the matching algorithm just always send the ride offer to the single geographically closest driver?

**Answer:** Distance alone as the sole ranking factor can create fairness problems — a cluster of drivers near busy pickup zones always wins offers while others rarely get matched — and ignores real signals like a driver's likelihood to actually accept. Ranking by a blend of distance, rating, and recent acceptance rate trades a small amount of matching speed for a fairer, more sustainable driver marketplace.

*Source: [06-Design-Uber-Ride-Hailing.md#3-why-doesnt-the-matching-algorithm-just-always-send-the-ride-offer-to-the-single-geographically-closest-driver](06-Design-Uber-Ride-Hailing.md#3-why-doesnt-the-matching-algorithm-just-always-send-the-ride-offer-to-the-single-geographically-closest-driver)*

### 4. Why must the ride-completion/payment endpoint be idempotent, and how would you implement that?

**Answer:** A network retry (the client resending a request it didn't get a confirmed response for) must not charge the rider a second time for the same ride. Using the ride ID itself as an idempotency key, checked against a unique constraint before processing the charge, ensures a duplicate request either no-ops or returns the original result instead of double-charging.

*Source: [06-Design-Uber-Ride-Hailing.md#4-why-must-the-ride-completionpayment-endpoint-be-idempotent-and-how-would-you-implement-that](06-Design-Uber-Ride-Hailing.md#4-why-must-the-ride-completionpayment-endpoint-be-idempotent-and-how-would-you-implement-that)*

### 5. What real-time infrastructure does surge pricing actually depend on?

**Answer:** A continuously updated, per-geographic-zone count of pending ride requests versus currently available nearby drivers — the same geospatial location infrastructure used for matching, queried for aggregate counts rather than individual nearest-driver lookups. Without that real-time supply/demand signal, surge pricing would be reacting to stale data and either over- or under-price a genuinely changing situation.

*Source: [06-Design-Uber-Ride-Hailing.md#5-what-real-time-infrastructure-does-surge-pricing-actually-depend-on](06-Design-Uber-Ride-Hailing.md#5-what-real-time-infrastructure-does-surge-pricing-actually-depend-on)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It accepts occasionally stale, best-effort driver location data — tolerable because a GPS pin being a few seconds old is invisible to the user — in exchange for being able to absorb over a million location updates per second, while keeping the ride and payment path on fully consistent, transactional storage where staleness or duplication would be a real, visible problem.

*Source: [06-Design-Uber-Ride-Hailing.md#6-whats-this-designs-core-trade-off-in-one-sentence](06-Design-Uber-Ride-Hailing.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

### 7. Why does a ride-hailing app's frontend need a persistent WebSocket rather than the polling/SSE (Server-Sent Events) choice a social feed makes?

**Answer:** Live driver location needs frequent (every few seconds), continuous updates during an active match or ride, and the connection is genuinely bidirectional — ride status and cancellations flow from both sides, not just server-to-client. That combination of frequency and bidirectionality is exactly what a persistent WebSocket is suited for, unlike a social feed's much lower-frequency, one-directional "something new exists" signal.

*Source: [06-Design-Uber-Ride-Hailing.md#7-why-does-a-ride-hailing-apps-frontend-need-a-persistent-websocket-rather-than-the-pollingsse-server-sent-events-choice-a-social-feed-makes](06-Design-Uber-Ride-Hailing.md#7-why-does-a-ride-hailing-apps-frontend-need-a-persistent-websocket-rather-than-the-pollingsse-server-sent-events-choice-a-social-feed-makes)*

### 8. Why should a dropped connection mid-ride not cancel the ride itself?

**Answer:** A cellular dead zone or brief network drop is common and shouldn't be treated as a ride-ending failure — the client should reconnect and resync the current ride state from the server, treating the real-time connection as a resumable stream layered on top of the ride's actual source of truth (the ride record in the database), not as the ride's only representation.

*Source: [06-Design-Uber-Ride-Hailing.md#8-why-should-a-dropped-connection-mid-ride-not-cancel-the-ride-itself](06-Design-Uber-Ride-Hailing.md#8-why-should-a-dropped-connection-mid-ride-not-cancel-the-ride-itself)*

## [7. Design an E-Commerce Platform (Amazon/Flipkart-style)](07-Design-E-Commerce-Platform.md)

### 1. Why does a read-then-write stock check fail under concurrency, and what's the actual fix?

**Answer:** Two concurrent requests can both read the same "in stock" count before either writes back their decrement, so both proceed and both succeed against what was actually the last unit — a classic lost update. The fix is a single atomic conditional `UPDATE ... WHERE available_quantity >= requested_quantity`, which makes the check and the decrement one indivisible database operation, so only one of two concurrent requests against the last unit can ever actually succeed.

*Source: [07-Design-E-Commerce-Platform.md#1-why-does-a-read-then-write-stock-check-fail-under-concurrency-and-whats-the-actual-fix](07-Design-E-Commerce-Platform.md#1-why-does-a-read-then-write-stock-check-fail-under-concurrency-and-whats-the-actual-fix)*

### 2. Why can't checkout be one single database transaction covering inventory, payment, and the order record?

**Answer:** The payment gateway is an external system with its own separate commit boundary — there's no cross-system transaction that can atomically span your database and a third-party payment processor. The checkout flow is instead a saga: a sequence of local steps, each with an explicit compensating action (releasing reserved inventory) if a later step fails.

*Source: [07-Design-E-Commerce-Platform.md#2-why-cant-checkout-be-one-single-database-transaction-covering-inventory-payment-and-the-order-record](07-Design-E-Commerce-Platform.md#2-why-cant-checkout-be-one-single-database-transaction-covering-inventory-payment-and-the-order-record)*

### 3. Why would a flash sale need Redis-based inventory reservation instead of just relying on the database's row lock?

**Answer:** The atomic conditional update is correct even under massive concurrency, but correctness doesn't mean high throughput — 100,000 concurrent requests against one row still serialize against that row's lock. Moving the hot-path decrement into a fast in-memory counter (Redis `DECR`) handles far higher throughput, with the relational database reconciled as the durable source of truth shortly after, at the cost of a brief window of eventual consistency.

*Source: [07-Design-E-Commerce-Platform.md#3-why-would-a-flash-sale-need-redis-based-inventory-reservation-instead-of-just-relying-on-the-databases-row-lock](07-Design-E-Commerce-Platform.md#3-why-would-a-flash-sale-need-redis-based-inventory-reservation-instead-of-just-relying-on-the-databases-row-lock)*

### 4. Why should product listing pages be server-rendered while the checkout flow is client-rendered?

**Answer:** Product pages need to be indexed by search engines and load fast for anonymous visitors who are the actual source of organic traffic — that's a strong argument for SSR/SSG. Checkout is authenticated, highly interactive, and has no SEO value at all, so CSR fits it better; using one rendering strategy for the whole site would either hurt SEO or add unnecessary server rendering cost to a page that gains nothing from it.

*Source: [07-Design-E-Commerce-Platform.md#4-why-should-product-listing-pages-be-server-rendered-while-the-checkout-flow-is-client-rendered](07-Design-E-Commerce-Platform.md#4-why-should-product-listing-pages-be-server-rendered-while-the-checkout-flow-is-client-rendered)*

### 5. Why must a payment charge use an idempotency key, and what should it be?

**Answer:** A network retry of the same checkout request (the client didn't get a confirmed response and tries again) must not charge the customer a second time for the same order. Using the order ID itself as the idempotency key, checked against the payment gateway or a local unique constraint before charging, ensures a duplicate request returns the original result instead of a second charge.

*Source: [07-Design-E-Commerce-Platform.md#5-why-must-a-payment-charge-use-an-idempotency-key-and-what-should-it-be](07-Design-E-Commerce-Platform.md#5-why-must-a-payment-charge-use-an-idempotency-key-and-what-should-it-be)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It keeps checkout strictly consistent (atomic inventory, idempotent payment, an explicit saga with compensation) while keeping catalog browsing eventually consistent and heavily cached, because the cost of getting each of those two paths wrong is completely different — overselling or double-charging is a real financial and trust problem, while a briefly stale product price is not.

*Source: [07-Design-E-Commerce-Platform.md#6-whats-this-designs-core-trade-off-in-one-sentence](07-Design-E-Commerce-Platform.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [8. Design a Large File Upload System (e.g., a 5GB Video/Image Upload)](08-Design-Large-File-Upload.md)

### 1. Why should large file bytes never pass through your own application server?

**Answer:** Routing gigabytes of data through your server ties up a request for the entire transfer duration and makes your server's own bandwidth and memory the bottleneck for every concurrent upload. Issuing a short-lived presigned URL and letting the client upload directly to object storage removes that bottleneck entirely — your server only ever handles small control-plane requests.

*Source: [08-Design-Large-File-Upload.md#1-why-should-large-file-bytes-never-pass-through-your-own-application-server](08-Design-Large-File-Upload.md#1-why-should-large-file-bytes-never-pass-through-your-own-application-server)*

### 2. Why chunk the upload instead of sending the whole 5GB file in one request?

**Answer:** A single request-scale transfer that fails partway through (a very likely outcome over a real, unreliable network across a multi-hour transfer) forces a full restart. Splitting into independently-uploadable chunks means a failure only costs the one chunk in flight, and object storage's own multipart upload APIs are explicitly built around this exact chunked shape.

*Source: [08-Design-Large-File-Upload.md#2-why-chunk-the-upload-instead-of-sending-the-whole-5gb-file-in-one-request](08-Design-Large-File-Upload.md#2-why-chunk-the-upload-instead-of-sending-the-whole-5gb-file-in-one-request)*

### 3. What's the actual difference between "resumable across a network drop" and "resumable across an app restart," and why does it matter which one you design for?

**Answer:** Surviving a network drop only requires in-memory retry logic for the current session. Surviving a full app restart or device reboot requires the client to persist upload progress (which chunks are confirmed, their ETags) to durable local storage like IndexedDB, and to reconcile that against the server's own record of confirmed chunks on resume. Stating which guarantee you're actually building for is a meaningful, gradable design decision, not a detail to gloss over.

*Source: [08-Design-Large-File-Upload.md#3-whats-the-actual-difference-between-resumable-across-a-network-drop-and-resumable-across-an-app-restart-and-why-does-it-matter-which-one-you-design-for](08-Design-Large-File-Upload.md#3-whats-the-actual-difference-between-resumable-across-a-network-drop-and-resumable-across-an-app-restart-and-why-does-it-matter-which-one-you-design-for)*

### 4. Why shouldn't file processing (virus scan, transcoding) happen synchronously as part of the upload-completion request?

**Answer:** Processing a large file — especially transcoding video — can take real minutes, far longer than any reasonable HTTP request timeout. Publishing an event to a queue and letting background workers process it asynchronously, with the client polling or subscribing for a status change, is the only approach that doesn't force the upload-completion request itself to hang for however long processing takes.

*Source: [08-Design-Large-File-Upload.md#4-why-shouldnt-file-processing-virus-scan-transcoding-happen-synchronously-as-part-of-the-upload-completion-request](08-Design-Large-File-Upload.md#4-why-shouldnt-file-processing-virus-scan-transcoding-happen-synchronously-as-part-of-the-upload-completion-request)*

### 5. How would you avoid re-uploading a multi-gigabyte file that's already been uploaded before (by anyone)?

**Answer:** Compute a content checksum client-side before starting the upload and check it against already-stored files' checksums; if it matches, the system can skip the actual data transfer entirely and just reference the existing stored object. This is a real, valuable deduplication optimization once you're operating at any meaningful scale.

*Source: [08-Design-Large-File-Upload.md#5-how-would-you-avoid-re-uploading-a-multi-gigabyte-file-thats-already-been-uploaded-before-by-anyone](08-Design-Large-File-Upload.md#5-how-would-you-avoid-re-uploading-a-multi-gigabyte-file-thats-already-been-uploaded-before-by-anyone)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It removes the application server from the file-transfer data path entirely, trading a meaningful amount of client-side complexity (chunking, resumability, presigned URL orchestration) for backend infrastructure that scales independently of how many large uploads are happening concurrently.

*Source: [08-Design-Large-File-Upload.md#6-whats-this-designs-core-trade-off-in-one-sentence](08-Design-Large-File-Upload.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [9. Design a Chat System (Slack/WhatsApp-style)](09-Design-Chat-System.md)

### 1. Why is delivering a chat message not as simple as "write to the recipient's socket"?

**Answer:** The sender and recipient are almost certainly connected to two different gateway servers in a horizontally-scaled fleet, so the sending server has no direct handle on the recipient's connection at all. A pub/sub layer in the middle, keyed by recipient (or by which specific gateway server they're connected to), is what routes the message to wherever that connection actually lives.

*Source: [09-Design-Chat-System.md#1-why-is-delivering-a-chat-message-not-as-simple-as-write-to-the-recipients-socket](09-Design-Chat-System.md#1-why-is-delivering-a-chat-message-not-as-simple-as-write-to-the-recipients-socket)*

### 2. Why must a message be persisted to durable storage before (or independently of) the real-time push attempt?

**Answer:** If persistence depended on the recipient being online at that exact moment, an offline recipient would simply lose messages sent while they were away — a serious trust-breaking failure for a chat product. Persisting first makes durability unconditional, and the real-time push becomes a pure optimization for the common case where the recipient happens to be connected right then.

*Source: [09-Design-Chat-System.md#2-why-must-a-message-be-persisted-to-durable-storage-before-or-independently-of-the-real-time-push-attempt](09-Design-Chat-System.md#2-why-must-a-message-be-persisted-to-durable-storage-before-or-independently-of-the-real-time-push-attempt)*

### 3. How does the client correctly order messages that might arrive out of order over the network?

**Answer:** Each message carries a server-assigned, per-conversation monotonically increasing sequence number, and the client sorts and displays messages by that sequence number rather than by arrival order or a client-side timestamp, which can't be trusted to reflect true send order under network reordering or clock skew.

*Source: [09-Design-Chat-System.md#3-how-does-the-client-correctly-order-messages-that-might-arrive-out-of-order-over-the-network](09-Design-Chat-System.md#3-how-does-the-client-correctly-order-messages-that-might-arrive-out-of-order-over-the-network)*

### 4. How is a chat group's message fan-out the same underlying problem as a social feed's celebrity fan-out?

**Answer:** Both require delivering one piece of content to every member of a potentially large audience — a group's member list in chat, a celebrity's follower list in a feed. Both systems face the same scaling cliff at large audience sizes and the same general fix: push-based delivery for smaller audiences, and a pull-based ("fetch recent messages on demand") fallback once the audience is too large to fan out to individually in real time.

*Source: [09-Design-Chat-System.md#4-how-is-a-chat-groups-message-fan-out-the-same-underlying-problem-as-a-social-feeds-celebrity-fan-out](09-Design-Chat-System.md#4-how-is-a-chat-groups-message-fan-out-the-same-underlying-problem-as-a-social-feeds-celebrity-fan-out)*

### 5. What must the frontend do differently for a chat app's WebSocket connection compared to, say, a live feed's real-time channel?

**Answer:** A chat client must reconnect automatically with backoff on disconnect and then reconcile exactly what was missed (using the last known sequence number) — a feed's "new content available" signal is comparatively low-stakes to miss briefly, while a dropped chat connection that doesn't reconcile missed messages is a real, visible bug for a product where message delivery is the core promise.

*Source: [09-Design-Chat-System.md#5-what-must-the-frontend-do-differently-for-a-chat-apps-websocket-connection-compared-to-say-a-live-feeds-real-time-channel](09-Design-Chat-System.md#5-what-must-the-frontend-do-differently-for-a-chat-apps-websocket-connection-compared-to-say-a-live-feeds-real-time-channel)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It treats durable persistence as the actual delivery guarantee and the real-time push path as a best-effort optimization layered on top, so an offline recipient never loses a message — they just receive it a little later, through the same durable path every message goes through regardless of whether anyone was online to receive it instantly.

*Source: [09-Design-Chat-System.md#6-whats-this-designs-core-trade-off-in-one-sentence](09-Design-Chat-System.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [10. Design Google Docs (Real-Time Collaborative Editor)](10-Design-Google-Docs-Collaborative-Editor.md)

### 1. Why can't concurrent edits just be applied to the document in whatever order they arrive at the server?

**Answer:** Each edit was made against the editor's own last-known document state, before seeing the other person's edit — naively applying both in arrival order lets their positions collide, since one edit's target position assumed a document state the other edit has since changed. Operational Transformation exists specifically to adjust ("transform") one operation's effect to account for another's, so the final result is correct regardless of arrival order.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#1-why-cant-concurrent-edits-just-be-applied-to-the-document-in-whatever-order-they-arrive-at-the-server](10-Design-Google-Docs-Collaborative-Editor.md#1-why-cant-concurrent-edits-just-be-applied-to-the-document-in-whatever-order-they-arrive-at-the-server)*

### 2. What's the practical difference between OT and CRDTs, and why does Google Docs use OT specifically?

**Answer:** OT transforms operations against each other through a central sequencing authority (typically a server), while CRDTs give every element a stable identifier that lets operations merge correctly in any order with no transformation step or central authority needed. OT fits Google Docs' actual client-server architecture well and is comparatively lighter-weight; CRDTs shine more in fully peer-to-peer or heavily offline-first systems where there's no natural server to act as the transformation authority.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#2-whats-the-practical-difference-between-ot-and-crdts-and-why-does-google-docs-use-ot-specifically](10-Design-Google-Docs-Collaborative-Editor.md#2-whats-the-practical-difference-between-ot-and-crdts-and-why-does-google-docs-use-ot-specifically)*

### 3. How does offline editing get reconciled once a client reconnects?

**Answer:** The client keeps composing local operations against its last-known version while offline, then sends them to the server on reconnect, which transforms them against every operation that landed while the client was disconnected — using exactly the same transformation machinery used for a simple few-hundred-millisecond network delay, with no special-case logic for "this client was offline for an hour."

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#3-how-does-offline-editing-get-reconciled-once-a-client-reconnects](10-Design-Google-Docs-Collaborative-Editor.md#3-how-does-offline-editing-get-reconciled-once-a-client-reconnects)*

### 4. Why must a remote collaborator's incoming edit adjust the local user's own cursor position?

**Answer:** If another user inserts text before your cursor and your cursor position isn't adjusted, it silently ends up pointing at different text than what you were actually looking at and about to type into — a real, highly visible bug in a hand-rolled collaborative editor, and one of the trickiest correctness details to get right in this whole system.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#4-why-must-a-remote-collaborators-incoming-edit-adjust-the-local-users-own-cursor-position](10-Design-Google-Docs-Collaborative-Editor.md#4-why-must-a-remote-collaborators-incoming-edit-adjust-the-local-users-own-cursor-position)*

### 5. Why does this design store the full operation log instead of just the current document snapshot?

**Answer:** The operation log is what makes version history and "who wrote this specific word" attribution possible at all — a snapshot alone only has the current state, with no record of how it got there. The periodic snapshot exists purely as a load-time optimization so a client doesn't have to replay the entire history from the document's creation on every open.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#5-why-does-this-design-store-the-full-operation-log-instead-of-just-the-current-document-snapshot](10-Design-Google-Docs-Collaborative-Editor.md#5-why-does-this-design-store-the-full-operation-log-instead-of-just-the-current-document-snapshot)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It trades real algorithmic complexity (a correct OT implementation, cursor-position reconciliation on incoming remote edits) for an editing experience with zero perceived latency, since every keystroke applies locally and instantly while server-side reconciliation happens invisibly in the background.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#6-whats-this-designs-core-trade-off-in-one-sentence](10-Design-Google-Docs-Collaborative-Editor.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [11. Design a URL Shortener (bit.ly / TinyURL)](11-Design-URL-Shortener.md)

### 1. Why is base62-encoding a unique ID generally preferred over hashing the long URL for generating short codes?

**Answer:** Hashing requires explicit collision detection and retry logic, since two different long URLs (or an unlucky truncation) can produce the same short hash. Base62-encoding a value that's already guaranteed unique by construction (an auto-incrementing ID) produces a unique short code with zero collision risk and no retry logic needed at all.

*Source: [11-Design-URL-Shortener.md#1-why-is-base62-encoding-a-unique-id-generally-preferred-over-hashing-the-long-url-for-generating-short-codes](11-Design-URL-Shortener.md#1-why-is-base62-encoding-a-unique-id-generally-preferred-over-hashing-the-long-url-for-generating-short-codes)*

### 2. Why does a single auto-incrementing counter become a real bottleneck, and what's the standard fix?

**Answer:** Every server needing a new ID would have to contact the same central counter on every single creation request, serializing all short-code generation across the entire fleet through one point of contention. The fix is pre-allocating a batch of IDs (e.g. 10,000 at a time) to each server, which then hands out IDs from its own local batch without touching the central counter again until it runs low.

*Source: [11-Design-URL-Shortener.md#2-why-does-a-single-auto-incrementing-counter-become-a-real-bottleneck-and-whats-the-standard-fix](11-Design-URL-Shortener.md#2-why-does-a-single-auto-incrementing-counter-become-a-real-bottleneck-and-whats-the-standard-fix)*

### 3. What's the actual, consequential difference between using a 301 and a 302 redirect for a short link, and which would you pick?

**Answer:** A 301 lets browsers cache the redirect, so repeat clicks from the same browser never hit your server again — less load, but you lose visibility into those repeat clicks. A 302 is never cached that way, so every single click reliably reaches your server, giving accurate click analytics at the cost of more redirect traffic. Since click analytics is usually a core feature of a URL shortener product, 302 is the more common real-world choice.

*Source: [11-Design-URL-Shortener.md#3-whats-the-actual-consequential-difference-between-using-a-301-and-a-302-redirect-for-a-short-link-and-which-would-you-pick](11-Design-URL-Shortener.md#3-whats-the-actual-consequential-difference-between-using-a-301-and-a-302-redirect-for-a-short-link-and-which-would-you-pick)*

### 4. Why should click-count tracking never happen synchronously as part of the redirect response?

**Answer:** The redirect is on the critical path of a user's actual navigation, waiting to get to their destination — adding a synchronous database write for analytics on that path adds latency to something that should be as close to instant as possible. Incrementing the click count asynchronously (a queue, or a buffered/batched write) keeps the redirect itself fast regardless of how the analytics write is eventually processed.

*Source: [11-Design-URL-Shortener.md#4-why-should-click-count-tracking-never-happen-synchronously-as-part-of-the-redirect-response](11-Design-URL-Shortener.md#4-why-should-click-count-tracking-never-happen-synchronously-as-part-of-the-redirect-response)*

### 5. Why is a URL shortener's frontend unusually thin compared to the other scenarios in this folder?

**Answer:** The actual redirect — the core functionality most users interact with — is a raw server-issued HTTP redirect that the browser follows directly, with no client-side application running at that URL at all. The only meaningful frontend surface is the link-creation form (and optionally an analytics dashboard), which is a simple, low-stakes page by comparison to something like a chat client or a collaborative editor.

*Source: [11-Design-URL-Shortener.md#5-why-is-a-url-shorteners-frontend-unusually-thin-compared-to-the-other-scenarios-in-this-folder](11-Design-URL-Shortener.md#5-why-is-a-url-shorteners-frontend-unusually-thin-compared-to-the-other-scenarios-in-this-folder)*
