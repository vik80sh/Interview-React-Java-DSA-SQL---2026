# Master Question Bank — System Design

This file aggregates every interview question and its full answer from all 11 files in this `SystemDesign` folder, in file order, so you can drill the entire folder's Q&A in one place. Each question is followed by its verbatim answer and a source link back to the exact question in its original file, for deeper context (the surrounding architecture, diagrams, and reasoning that produced that answer). All 11 files use the same explicit `## Interview Questions and Answers` section format, so nothing here is inferred or reconstructed — it's copied as written.

## [1. System Design Fundamentals](01-System-Design-Fundamentals.md)

### 1. Explain the CAP theorem, and why "choose 2 of 3" is a slight oversimplification.

**Answer:** Simple way to remember it: CAP says you can't have consistency, availability, and partition tolerance all at once in a distributed system. Partitions happen — that's just reality — so the real choice is CP or AP. CP means during a partition you refuse some requests to keep the data correct. AP means you keep answering, even if that means two nodes briefly disagree. Here's why "2 of 3" oversimplifies it: you don't pick once for the whole system. Different features inside the same app can make different choices — payments might go CP, the newsfeed might go AP — based on how much staleness each one can tolerate.

*Source: [01-System-Design-Fundamentals.md#1-explain-the-cap-theorem-and-why-choose-2-of-3-is-a-slight-oversimplification](01-System-Design-Fundamentals.md#1-explain-the-cap-theorem-and-why-choose-2-of-3-is-a-slight-oversimplification)*

### 2. When would you choose ACID over BASE, and vice versa?

**Answer:** Rule of thumb: if being wrong for a second could cost real money or break a promise, use ACID. If being wrong for a second is invisible, use BASE. Account balances and checkout inventory counts have hard invariants that can never break, even under concurrent access — that's ACID. Follower counts, view counters, cached recommendation lists can be briefly stale and nobody notices — that's BASE, and it buys you availability and speed at massive scale.

*Source: [01-System-Design-Fundamentals.md#2-when-would-you-choose-acid-over-base-and-vice-versa](01-System-Design-Fundamentals.md#2-when-would-you-choose-acid-over-base-and-vice-versa)*

### 3. How do you estimate the QPS a system needs to handle, and why use peak instead of average?

**Answer:** Simple formula: DAU times actions per user per day, divided by seconds in a day — that gives you average QPS. Then multiply by a peak factor, usually 2 to 3x, because traffic isn't spread evenly across the day. Here's the hook: a system sized for the average fails exactly when it matters most — at peak. So real capacity planning always targets peak QPS plus a safety margin, never the average.

*Source: [01-System-Design-Fundamentals.md#3-how-do-you-estimate-the-qps-a-system-needs-to-handle-and-why-use-peak-instead-of-average](01-System-Design-Fundamentals.md#3-how-do-you-estimate-the-qps-a-system-needs-to-handle-and-why-use-peak-instead-of-average)*

### 4. Vertical vs horizontal scaling — how do you decide which to reach for first?

**Answer:** Simple way to decide: stateful and hard to split, like a single database — scale up first, because it's simpler with zero coordination cost, until you hit the ceiling. Stateless and easy to split, like web or API servers — scale out early, because the coordination cost is small (just a load balancer, no shared local state) and you get near-unlimited scale plus no single point of failure.

*Source: [01-System-Design-Fundamentals.md#4-vertical-vs-horizontal-scaling-how-do-you-decide-which-to-reach-for-first](01-System-Design-Fundamentals.md#4-vertical-vs-horizontal-scaling-how-do-you-decide-which-to-reach-for-first)*

### 5. Why does the "right" trade-off between consistency, availability, and latency depend entirely on the system?

**Answer:** Picture it this way: a bank and a social feed would make opposite choices, and both would be right. A bank can't tolerate an inconsistent balance even for a second, so it leans toward consistency. A social feed can tolerate being a few seconds stale far more easily than it can tolerate being down, so it leans toward availability. Each of the three — consistency, availability, latency — costs something different, and there's no universal right answer. There's only the answer that matches what that specific system's users actually need.

*Source: [01-System-Design-Fundamentals.md#5-why-does-the-right-trade-off-between-consistency-availability-and-latency-depend-entirely-on-the-system](01-System-Design-Fundamentals.md#5-why-does-the-right-trade-off-between-consistency-availability-and-latency-depend-entirely-on-the-system)*

### 6. What's the first thing you should do when given an open-ended "design X" prompt?

**Answer:** Simple rule: ask before you draw. Pin down the functional and non-functional requirements first — scale, latency expectations, consistency needs, and which features actually matter for this conversation. Skip that and start designing right away, and you risk spending the whole interview solving a problem the interviewer never actually asked about.

*Source: [01-System-Design-Fundamentals.md#6-whats-the-first-thing-you-should-do-when-given-an-open-ended-design-x-prompt](01-System-Design-Fundamentals.md#6-whats-the-first-thing-you-should-do-when-given-an-open-ended-design-x-prompt)*

## [2. Scalability and Load Balancing](02-Scalability-Load-Balancing.md)

### 1. Why is Layer 7 load balancing generally preferred over Layer 4 despite the extra overhead?

**Answer:** Simple way to think about it: Layer 4 only sees an envelope — IP and port. Layer 7 opens the envelope and reads the letter — the actual HTTP path, headers, cookies. That means Layer 7 can route intelligently: different services per path, session-aware routing, A/B testing by header. Layer 4 can't do any of that, no matter how you configure it. The extra processing cost of reading the request is small, and the routing flexibility it buys is almost always worth it.

*Source: [02-Scalability-Load-Balancing.md#1-why-is-layer-7-load-balancing-generally-preferred-over-layer-4-despite-the-extra-overhead](02-Scalability-Load-Balancing.md#1-why-is-layer-7-load-balancing-generally-preferred-over-layer-4-despite-the-extra-overhead)*

### 2. What problem do sticky sessions create, and what's the real fix?

**Answer:** Here's the problem: if a user's session lives only in one server's local memory, that user gets glued to that one server forever. If that server dies, their session dies with it. And you can't cleanly take that server down for maintenance either. The real fix isn't smarter routing — it's removing session state from servers entirely. Put it in a shared store like Redis, or hand the client a self-contained signed token like a JWT. Then every server is stateless, and any server can handle any request.

*Source: [02-Scalability-Load-Balancing.md#2-what-problem-do-sticky-sessions-create-and-whats-the-real-fix](02-Scalability-Load-Balancing.md#2-what-problem-do-sticky-sessions-create-and-whats-the-real-fix)*

### 3. What's replication lag, and what real bug does it cause?

**Answer:** Replication lag is just the delay between a write hitting the primary database and that write showing up on a read replica. Here's the bug it causes: you save something, then immediately read it back, and you get routed to a replica that hasn't caught up yet — so your own change looks like it vanished. The fix isn't to chase down and eliminate the lag. It's simpler: route that specific "read my own write" request back to the primary.

*Source: [02-Scalability-Load-Balancing.md#3-whats-replication-lag-and-what-real-bug-does-it-cause](02-Scalability-Load-Balancing.md#3-whats-replication-lag-and-what-real-bug-does-it-cause)*

### 4. What's the real difference between replication and sharding, and when do you need each?

**Answer:** Simple way to remember it: replication copies, sharding splits. Replication puts the same full dataset on multiple machines — that scales reads and gives you failure redundancy. Sharding splits the dataset into separate pieces across multiple machines — that scales writes, because different shards can be written to in parallel. Most systems reach for replication first, since it's cheaper and simpler, and only shard once write throughput itself — not just read throughput — becomes the actual bottleneck.

*Source: [02-Scalability-Load-Balancing.md#4-whats-the-real-difference-between-replication-and-sharding-and-when-do-you-need-each](02-Scalability-Load-Balancing.md#4-whats-the-real-difference-between-replication-and-sharding-and-when-do-you-need-each)*

### 5. Why does the choice of shard key matter so much, and what's the real cost of getting it wrong?

**Answer:** The shard key is basically a line you draw once that decides which queries stay fast forever and which become expensive forever. Anything scoped to that key stays fast. Anything that has to reach across shards and merge results gets expensive. And it's worse than just "slower" — cross-shard joins and multi-shard transactions become genuinely hard to do correctly at all. That's why getting the shard key wrong is close to irreversible; fixing it means a real data migration, not a config change.

*Source: [02-Scalability-Load-Balancing.md#5-why-does-the-choice-of-shard-key-matter-so-much-and-whats-the-real-cost-of-getting-it-wrong](02-Scalability-Load-Balancing.md#5-why-does-the-choice-of-shard-key-matter-so-much-and-whats-the-real-cost-of-getting-it-wrong)*

### 6. Why is consistent hashing preferred over plain modulo hashing for shard assignment?

**Answer:** Here's the problem with plain modulo hashing — `hash(key) % N` — add or remove just one shard, and N changes, which flips the answer for almost every single key. That means a near-total data reshuffle just to add one machine. Consistent hashing fixes this by placing keys on a hash ring instead: add or remove a shard, and only the keys sitting in that one changed slice of the ring need to move. Re-sharding goes from "reshuffle almost everything" to "move a small slice."

*Source: [02-Scalability-Load-Balancing.md#6-why-is-consistent-hashing-preferred-over-plain-modulo-hashing-for-shard-assignment](02-Scalability-Load-Balancing.md#6-why-is-consistent-hashing-preferred-over-plain-modulo-hashing-for-shard-assignment)*

## [3. Database Design for System Design Interviews](03-Database-Design.md)

### 1. How do you actually decide between a relational and a document database for a new system, without just picking a favorite?

**Answer:** Ask two questions. One: does the data have real relationships and invariants that need enforcing across entities? If yes, that favors relational. Two: does each record's shape vary a lot or change unpredictably? If yes, that favors document. Orders, payments, inventory — those need strict relational integrity, so go relational no matter the scale. A multi-category product catalog where every product type has different attributes — that favors a document store even at modest scale.

*Source: [03-Database-Design.md#1-how-do-you-actually-decide-between-a-relational-and-a-document-database-for-a-new-system-without-just-picking-a-favorite](03-Database-Design.md#1-how-do-you-actually-decide-between-a-relational-and-a-document-database-for-a-new-system-without-just-picking-a-favorite)*

### 2. Why would you denormalize a like-count directly onto a post instead of always computing `COUNT(*)` on the likes table?

**Answer:** Rule of thumb: whichever side gets hit more — reads or writes — that's the side you optimize for, and you push the cost to the other side. Posts get read far more often than they get liked. If you ran `COUNT(*)` on every single read, you'd be multiplying an expensive operation by a huge read volume. Instead, store a running counter on the post itself. Now the cost moves to write time — a small increment per like — which is the cheap side of this particular ratio.

*Source: [03-Database-Design.md#2-why-would-you-denormalize-a-like-count-directly-onto-a-post-instead-of-always-computing-count-on-the-likes-table](03-Database-Design.md#2-why-would-you-denormalize-a-like-count-directly-onto-a-post-instead-of-always-computing-count-on-the-likes-table)*

### 3. What's the real risk of embedding a "reviews" array directly inside a product document in MongoDB?

**Answer:** Embedding a reviews array works fine at first — that's the trap. A popular product can rack up thousands of reviews, and now every single read of that product drags the entire array along with it. Worse, MongoDB documents have a hard size ceiling, and an ever-growing array can actually hit that ceiling. The fix: embed only a small summary — average rating, review count — and keep the full review list as its own separate, paginated collection.

*Source: [03-Database-Design.md#3-whats-the-real-risk-of-embedding-a-reviews-array-directly-inside-a-product-document-in-mongodb](03-Database-Design.md#3-whats-the-real-risk-of-embedding-a-reviews-array-directly-inside-a-product-document-in-mongodb)*

### 4. What actually distinguishes a read-heavy system's scaling strategy from a write-heavy system's?

**Answer:** Simple way to remember it: read-heavy systems push cost backward, write-heavy systems push cost forward. Read-heavy systems shift cost onto write time or a background job — caching, read replicas, precomputed aggregations — because reads happen constantly and that's where the multiplier lives. Write-heavy systems do the opposite: they absorb write bursts with a message queue, batch the writes, and often use a storage engine built specifically for write throughput. There, the bottleneck is the sheer rate of incoming writes, not what any single read costs.

*Source: [03-Database-Design.md#4-what-actually-distinguishes-a-read-heavy-systems-scaling-strategy-from-a-write-heavy-systems](03-Database-Design.md#4-what-actually-distinguishes-a-read-heavy-systems-scaling-strategy-from-a-write-heavy-systems)*

### 5. Why doesn't a single `posts(created_at)` index solve "generate my home feed"?

**Answer:** Here's the mismatch: a `posts(created_at)` index answers "what's newest across everyone." Your home feed needs "what's newest among the specific people I follow." Those are completely different queries, and once the follow graph gets large, the second one gets expensive fast against a single shared index. So real feed systems don't even try to answer that query live. They precompute a per-user feed ahead of time — a push, or fan-out, model — instead of hitting a shared index at read time.

*Source: [03-Database-Design.md#5-why-doesnt-a-single-postscreated_at-index-solve-generate-my-home-feed](03-Database-Design.md#5-why-doesnt-a-single-postscreated_at-index-solve-generate-my-home-feed)*

## [4. Design Twitter (Social Feed)](04-Design-Twitter-Social-Feed.md)

### 1. Why does the pull model fail for a normal user's feed at Twitter's scale, even though it's the simplest to implement?

**Answer:** The pull model sounds simple but doesn't survive scale. It means: on every single page load, live, query and merge tweets from every account that user follows. For someone following hundreds or thousands of accounts, that's an expensive multi-way merge — and you're repeating it on every feed refresh, for hundreds of millions of users. That's nowhere close to the sub-200ms latency users expect.

*Source: [04-Design-Twitter-Social-Feed.md#1-why-does-the-pull-model-fail-for-a-normal-users-feed-at-twitters-scale-even-though-its-the-simplest-to-implement](04-Design-Twitter-Social-Feed.md#1-why-does-the-pull-model-fail-for-a-normal-users-feed-at-twitters-scale-even-though-its-the-simplest-to-implement)*

### 2. Why does the push model break down specifically for celebrity accounts?

**Answer:** The push model flips the pull model's problem onto writes. Posting a tweet means writing it into every single follower's precomputed feed immediately. For a celebrity with tens of millions of followers, one tweet becomes tens of millions of writes. No matter how well you parallelize that fan-out, it can't complete fast enough to feel instant. It's not an infrastructure problem — the sheer write volume itself is the limit.

*Source: [04-Design-Twitter-Social-Feed.md#2-why-does-the-push-model-break-down-specifically-for-celebrity-accounts](04-Design-Twitter-Social-Feed.md#2-why-does-the-push-model-break-down-specifically-for-celebrity-accounts)*

### 3. How does the hybrid push/pull model actually solve the celebrity problem, precisely?

**Answer:** Simple split: small accounts push, celebrities don't. Ordinary accounts, below some follower threshold, still push their tweets out, since their fan-out is small and fast. Celebrity accounts skip push entirely. Instead, when a follower loads their feed, the system live-queries just the small, bounded set of celebrities that follower happens to follow, and merges those results into their precomputed pushed feed. That turns "fan out to 50 million followers" into "each follower does one small extra query" — a much cheaper operation.

*Source: [04-Design-Twitter-Social-Feed.md#3-how-does-the-hybrid-pushpull-model-actually-solve-the-celebrity-problem-precisely](04-Design-Twitter-Social-Feed.md#3-how-does-the-hybrid-pushpull-model-actually-solve-the-celebrity-problem-precisely)*

### 4. Why denormalize `like_count` onto the tweet instead of computing it with `COUNT(*)` on a likes table?

**Answer:** Same trick as the like-count question earlier: push the cost to the side that happens less often. Tweets get displayed in feeds far more often than they get liked. Recomputing a `COUNT(*)` on every single display multiplies an expensive operation by that huge read volume. A denormalized counter, bumped on each write, moves that cost onto the much rarer write path instead.

*Source: [04-Design-Twitter-Social-Feed.md#4-why-denormalize-like_count-onto-the-tweet-instead-of-computing-it-with-count-on-a-likes-table](04-Design-Twitter-Social-Feed.md#4-why-denormalize-like_count-onto-the-tweet-instead-of-computing-it-with-count-on-a-likes-table)*

### 5. Why is Elasticsearch used for search instead of querying the primary tweet database directly?

**Answer:** Simple way to see it: search and storage are different jobs, so use different tools. The primary database is built for transactional reads and writes. Full-text, relevance-ranked search is a fundamentally different workload — ranking text results by relevance at scale isn't what a general-purpose relational or key-value store is built to do. Elasticsearch is a dedicated tool for that job, updated asynchronously off the primary write path, so search traffic never competes with the database's core traffic.

*Source: [04-Design-Twitter-Social-Feed.md#5-why-is-elasticsearch-used-for-search-instead-of-querying-the-primary-tweet-database-directly](04-Design-Twitter-Social-Feed.md#5-why-is-elasticsearch-used-for-search-instead-of-querying-the-primary-tweet-database-directly)*

### 6. What's the actual trade-off this design makes, in one sentence?

**Answer:** In one line: fast and slightly stale beats perfectly fresh and slow. This design favors availability and fast, cache-backed reads over perfectly real-time consistency. A feed that's briefly a few seconds stale is a deliberate, acceptable cost — in exchange, feed loads stay consistently fast no matter how many accounts a user follows.

*Source: [04-Design-Twitter-Social-Feed.md#6-whats-the-actual-trade-off-this-design-makes-in-one-sentence](04-Design-Twitter-Social-Feed.md#6-whats-the-actual-trade-off-this-design-makes-in-one-sentence)*

### 7. Why is polling or SSE usually the better choice over a full WebSocket connection for "new tweets available"?

**Answer:** Match the tool to the actual need: a feed only needs a one-directional "something new exists" signal, not a full bidirectional connection. A persistent WebSocket per user is heavier infrastructure than that signal requires. So most feed products just poll periodically, or use lightweight Server-Sent Events to push a "new posts" banner, and only fetch the real content once the user actually taps it. A true WebSocket earns its cost for something that needs sub-second, two-way exchange — like a chat message — which a feed generally doesn't need.

*Source: [04-Design-Twitter-Social-Feed.md#7-why-is-polling-or-sse-usually-the-better-choice-over-a-full-websocket-connection-for-new-tweets-available](04-Design-Twitter-Social-Feed.md#7-why-is-polling-or-sse-usually-the-better-choice-over-a-full-websocket-connection-for-new-tweets-available)*

## [5. Design Netflix (Video Streaming Platform)](05-Design-Netflix-Video-Streaming.md)

### 1. Why can't Netflix serve video from a single central data center, even one with enormous bandwidth?

**Answer:** Two separate problems, and a single data center can't fix either one. First, the math: millions of concurrent viewers, each pulling multiple Mbps, adds up to terabits per second of aggregate bandwidth — no single network link can carry that. Second, physics: distance itself adds latency, so a user far from that one data center gets a slow start time no matter how much bandwidth exists. Spreading delivery across many regional CDN edge locations solves both at once — servers get physically closer to viewers, and the load gets spread across many independent network links instead of one.

*Source: [05-Design-Netflix-Video-Streaming.md#1-why-cant-netflix-serve-video-from-a-single-central-data-center-even-one-with-enormous-bandwidth](05-Design-Netflix-Video-Streaming.md#1-why-cant-netflix-serve-video-from-a-single-central-data-center-even-one-with-enormous-bandwidth)*

### 2. Why is video split into short chunks at multiple quality levels instead of one file per quality?

**Answer:** Chunking is what lets the player change its mind quickly. If the network gets worse, the player can switch quality at the very next chunk boundary — just seconds away — with no restart and no visible glitch. Compare that to one full file per quality level: switching quality mid-playback would mean jumping to some unrelated byte offset in a completely different file, which doesn't work cleanly at all.

*Source: [05-Design-Netflix-Video-Streaming.md#2-why-is-video-split-into-short-chunks-at-multiple-quality-levels-instead-of-one-file-per-quality](05-Design-Netflix-Video-Streaming.md#2-why-is-video-split-into-short-chunks-at-multiple-quality-levels-instead-of-one-file-per-quality)*

### 3. How does the player decide which quality chunk to request next?

**Answer:** Simple rule the player follows: look at how fast the last chunk downloaded, and pick the next chunk's quality based on that. If recent throughput can sustain a higher quality without rebuffering, it steps up. If not, it steps down. It just keeps recalculating this chunk by chunk as network conditions change.

*Source: [05-Design-Netflix-Video-Streaming.md#3-how-does-the-player-decide-which-quality-chunk-to-request-next](05-Design-Netflix-Video-Streaming.md#3-how-does-the-player-decide-which-quality-chunk-to-request-next)*

### 4. Why combine collaborative filtering with content-based filtering instead of using just one?

**Answer:** Each one covers the other's blind spot. Collaborative filtering — looking at similar users' behavior — finds genuinely good, sometimes cross-genre recommendations, but it has nothing to go on for a brand-new user or a brand-new title with no history yet. That's the cold-start problem. Content-based filtering — a title's own attributes, like genre and cast — works immediately even with zero history, so it fills exactly that gap. Combine both, and you cover what neither one can do alone.

*Source: [05-Design-Netflix-Video-Streaming.md#4-why-combine-collaborative-filtering-with-content-based-filtering-instead-of-using-just-one](05-Design-Netflix-Video-Streaming.md#4-why-combine-collaborative-filtering-with-content-based-filtering-instead-of-using-just-one)*

### 5. Why are recommendations computed offline in a batch job instead of live per page load?

**Answer:** Rule of thumb: if computing something live is too slow, precompute it and serve it from cache. Scoring an entire catalog against a user's profile in real time, on every single homepage visit, across tens of millions of daily users, would be far too slow and expensive to hit any reasonable latency bar. So Netflix precomputes a ranked list per user in a periodic batch job and serves it from a fast cache. The trade is small: recommendations reflect yesterday's data instead of this second's, in exchange for the homepage loading instantly.

*Source: [05-Design-Netflix-Video-Streaming.md#5-why-are-recommendations-computed-offline-in-a-batch-job-instead-of-live-per-page-load](05-Design-Netflix-Video-Streaming.md#5-why-are-recommendations-computed-offline-in-a-batch-job-instead-of-live-per-page-load)*

### 6. What's the core trade-off of this design, in one sentence?

**Answer:** In one line: a little invisible staleness buys a lot of speed and scale. A cached video chunk, a day-old recommendation ranking — small, mostly invisible costs. In exchange, you get delivery speed and scale that a fully real-time, centralized alternative simply couldn't touch at this volume.

*Source: [05-Design-Netflix-Video-Streaming.md#6-whats-the-core-trade-off-of-this-design-in-one-sentence](05-Design-Netflix-Video-Streaming.md#6-whats-the-core-trade-off-of-this-design-in-one-sentence)*

### 7. What frontend responsibility does a video streaming client have that most system design answers skip over?

**Answer:** It's not just "the browser plays a video tag" — the player itself does real work. The client implements the adaptive bitrate logic we just described: measuring its own recent download throughput and choosing the next chunk's quality, using the Media Source Extensions API or a wrapping library like hls.js. That's genuine, nontrivial client-side logic, and calling it out is exactly what separates a frontend-aware system design answer from a backend-only one.

*Source: [05-Design-Netflix-Video-Streaming.md#7-what-frontend-responsibility-does-a-video-streaming-client-have-that-most-system-design-answers-skip-over](05-Design-Netflix-Video-Streaming.md#7-what-frontend-responsibility-does-a-video-streaming-client-have-that-most-system-design-answers-skip-over)*

### 8. Why should the catalog/browse pages and the player screen use different rendering strategies?

**Answer:** Simple rule: render it on the server if it's the same for everyone, render it on the client if it's personal. Catalog and browse pages look largely the same for every visitor and benefit from SEO — good candidates for SSR/SSG. The player screen and personalized rows like "continue watching" are inherently per-user, state-dependent, and have zero SEO value — so those get rendered client-side against live, authenticated data instead.

*Source: [05-Design-Netflix-Video-Streaming.md#8-why-should-the-catalogbrowse-pages-and-the-player-screen-use-different-rendering-strategies](05-Design-Netflix-Video-Streaming.md#8-why-should-the-catalogbrowse-pages-and-the-player-screen-use-different-rendering-strategies)*

## [6. Design Uber / Ola (Ride-Hailing)](06-Design-Uber-Ride-Hailing.md)

### 1. Why does driver location get stored in Redis instead of the primary relational database?

**Answer:** Rule of thumb: match the store to what you can afford to lose. Driver location updates come in at massive volume — millions per second across a large fleet — but each one barely matters on its own. Lose one stale GPS ping and it's a non-event, since another arrives in a few seconds. A relational database's transactional write path isn't built for that volume-over-durability trade-off. An in-memory geospatial store like Redis is exactly the right tool for that. Ride and payment data, on the other hand, genuinely need the relational database's transactional guarantees — you can't shrug off a lost payment record the way you can a lost GPS ping.

*Source: [06-Design-Uber-Ride-Hailing.md#1-why-does-driver-location-get-stored-in-redis-instead-of-the-primary-relational-database](06-Design-Uber-Ride-Hailing.md#1-why-does-driver-location-get-stored-in-redis-instead-of-the-primary-relational-database)*

### 2. What does geohashing actually buy the matching system?

**Answer:** Picture the map cut into grid cells, each with its own short string name — that's geohashing. Nearby locations share a common prefix in that string. So a "find everything within X km" query doesn't have to compute exact distance against every single driver's raw coordinates — it just narrows down to a small set of nearby grid cells first. That's exactly what keeps a radius search fast even as the number of active drivers grows into the millions.

*Source: [06-Design-Uber-Ride-Hailing.md#2-what-does-geohashing-actually-buy-the-matching-system](06-Design-Uber-Ride-Hailing.md#2-what-does-geohashing-actually-buy-the-matching-system)*

### 3. Why doesn't the matching algorithm just always send the ride offer to the single geographically closest driver?

**Answer:** Distance alone creates a fairness problem: drivers clustered near busy pickup zones would win every offer, while everyone else rarely gets matched. It also ignores a useful signal — how likely that driver actually is to accept the ride. So instead, the algorithm ranks by a blend of distance, rating, and recent acceptance rate. That costs a small amount of matching speed, but buys a fairer, more sustainable driver marketplace.

*Source: [06-Design-Uber-Ride-Hailing.md#3-why-doesnt-the-matching-algorithm-just-always-send-the-ride-offer-to-the-single-geographically-closest-driver](06-Design-Uber-Ride-Hailing.md#3-why-doesnt-the-matching-algorithm-just-always-send-the-ride-offer-to-the-single-geographically-closest-driver)*

### 4. Why must the ride-completion/payment endpoint be idempotent, and how would you implement that?

**Answer:** Here's the risk: the client never got a confirmed response, so it retries the request — and that retry must not charge the rider a second time for the same ride. The fix is to use the ride ID itself as an idempotency key, checked against a unique constraint before the charge is processed. That way a duplicate request either does nothing or just returns the original result — never a second charge.

*Source: [06-Design-Uber-Ride-Hailing.md#4-why-must-the-ride-completionpayment-endpoint-be-idempotent-and-how-would-you-implement-that](06-Design-Uber-Ride-Hailing.md#4-why-must-the-ride-completionpayment-endpoint-be-idempotent-and-how-would-you-implement-that)*

### 5. What real-time infrastructure does surge pricing actually depend on?

**Answer:** Surge pricing runs on one number, kept fresh in real time: pending ride requests versus currently available nearby drivers, per geographic zone. It's the same geospatial location infrastructure used for matching — just queried for aggregate counts instead of individual nearest-driver lookups. Without that live supply/demand signal, surge pricing would be working off stale data, and would over-price or under-price a situation that's actually still changing.

*Source: [06-Design-Uber-Ride-Hailing.md#5-what-real-time-infrastructure-does-surge-pricing-actually-depend-on](06-Design-Uber-Ride-Hailing.md#5-what-real-time-infrastructure-does-surge-pricing-actually-depend-on)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** In one line: be sloppy where it doesn't matter, be strict where it does. Driver location is occasionally stale, best-effort data — fine, because a GPS pin being a few seconds old is invisible to the user. That looseness is what lets the system absorb over a million location updates per second. Ride and payment data stay on fully consistent, transactional storage, because staleness or duplication there would be a real, visible problem.

*Source: [06-Design-Uber-Ride-Hailing.md#6-whats-this-designs-core-trade-off-in-one-sentence](06-Design-Uber-Ride-Hailing.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

### 7. Why does a ride-hailing app's frontend need a persistent WebSocket rather than the polling/SSE (Server-Sent Events) choice a social feed makes?

**Answer:** Two things push this toward a WebSocket where a feed doesn't need one: frequency and direction. Driver location needs continuous updates every few seconds during an active match or ride — much more frequent than a feed's "something new exists" ping. And the connection is genuinely two-way — ride status and cancellations flow from both the rider and driver side, not just server-to-client. High frequency plus real bidirectionality is exactly what a persistent WebSocket is built for.

*Source: [06-Design-Uber-Ride-Hailing.md#7-why-does-a-ride-hailing-apps-frontend-need-a-persistent-websocket-rather-than-the-pollingsse-server-sent-events-choice-a-social-feed-makes](06-Design-Uber-Ride-Hailing.md#7-why-does-a-ride-hailing-apps-frontend-need-a-persistent-websocket-rather-than-the-pollingsse-server-sent-events-choice-a-social-feed-makes)*

### 8. Why should a dropped connection mid-ride not cancel the ride itself?

**Answer:** Simple way to think about it: the WebSocket is a live window onto the ride, not the ride itself. A cellular dead zone or a brief network drop is common and normal — it shouldn't end the ride. The client should just reconnect and resync the current ride state from the server. The real-time connection is a resumable stream layered on top of the actual source of truth — the ride record in the database — not the only representation of the ride.

*Source: [06-Design-Uber-Ride-Hailing.md#8-why-should-a-dropped-connection-mid-ride-not-cancel-the-ride-itself](06-Design-Uber-Ride-Hailing.md#8-why-should-a-dropped-connection-mid-ride-not-cancel-the-ride-itself)*

## [7. Design an E-Commerce Platform (Amazon/Flipkart-style)](07-Design-E-Commerce-Platform.md)

### 1. Why does a read-then-write stock check fail under concurrency, and what's the actual fix?

**Answer:** Here's the bug: two requests both read "1 in stock" before either one writes back its decrement. Both think they're fine, both proceed, and both succeed — against a single last unit. That's a classic lost update. The fix is to make the check and the decrement one indivisible operation: a single atomic conditional `UPDATE ... WHERE available_quantity >= requested_quantity`. Now only one of those two concurrent requests can actually succeed against that last unit.

*Source: [07-Design-E-Commerce-Platform.md#1-why-does-a-read-then-write-stock-check-fail-under-concurrency-and-whats-the-actual-fix](07-Design-E-Commerce-Platform.md#1-why-does-a-read-then-write-stock-check-fail-under-concurrency-and-whats-the-actual-fix)*

### 2. Why can't checkout be one single database transaction covering inventory, payment, and the order record?

**Answer:** Simple reason: the payment gateway is somebody else's system, with its own commit boundary — there's no transaction that can atomically span your database and a third-party payment processor. So checkout can't be one big transaction. Instead, it's a saga: a sequence of local steps, and each step has an explicit compensating action — like releasing reserved inventory — that runs if a later step fails.

*Source: [07-Design-E-Commerce-Platform.md#2-why-cant-checkout-be-one-single-database-transaction-covering-inventory-payment-and-the-order-record](07-Design-E-Commerce-Platform.md#2-why-cant-checkout-be-one-single-database-transaction-covering-inventory-payment-and-the-order-record)*

### 3. Why would a flash sale need Redis-based inventory reservation instead of just relying on the database's row lock?

**Answer:** Correct doesn't automatically mean fast. The atomic conditional update from before is correct even under massive concurrency — but 100,000 concurrent requests against one row still all serialize against that row's lock. That's the throughput problem a flash sale exposes. The fix is to move the hot-path decrement into a fast in-memory counter, like Redis `DECR`, which handles far higher throughput. The relational database catches up shortly after as the durable source of truth. The cost is a brief window of eventual consistency — a small price for surviving the traffic spike.

*Source: [07-Design-E-Commerce-Platform.md#3-why-would-a-flash-sale-need-redis-based-inventory-reservation-instead-of-just-relying-on-the-databases-row-lock](07-Design-E-Commerce-Platform.md#3-why-would-a-flash-sale-need-redis-based-inventory-reservation-instead-of-just-relying-on-the-databases-row-lock)*

### 4. Why should product listing pages be server-rendered while the checkout flow is client-rendered?

**Answer:** Same rule as the Netflix example: render for SEO where it matters, render for interactivity where it doesn't. Product listing pages need to be indexed by search engines and load fast for anonymous visitors — that's the actual source of organic traffic, so SSR or SSG makes sense there. Checkout is authenticated, highly interactive, and has zero SEO value, so client-side rendering fits it better. Pick one strategy for the whole site, and you either hurt SEO on the product pages or waste server-rendering cost on checkout for no benefit.

*Source: [07-Design-E-Commerce-Platform.md#4-why-should-product-listing-pages-be-server-rendered-while-the-checkout-flow-is-client-rendered](07-Design-E-Commerce-Platform.md#4-why-should-product-listing-pages-be-server-rendered-while-the-checkout-flow-is-client-rendered)*

### 5. Why must a payment charge use an idempotency key, and what should it be?

**Answer:** Same idea as the ride-payment question: a retry must never turn into a double charge. If the client doesn't get a confirmed response and retries the same checkout request, that retry must not charge the customer a second time for the same order. Use the order ID itself as the idempotency key — check it against the payment gateway or a local unique constraint before charging — so a duplicate request just returns the original result instead of billing twice.

*Source: [07-Design-E-Commerce-Platform.md#5-why-must-a-payment-charge-use-an-idempotency-key-and-what-should-it-be](07-Design-E-Commerce-Platform.md#5-why-must-a-payment-charge-use-an-idempotency-key-and-what-should-it-be)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** In one line: be strict with money, relaxed with browsing. Checkout stays strictly consistent — atomic inventory, idempotent payment, an explicit saga with compensation — because overselling or double-charging is a real financial and trust problem. Catalog browsing stays eventually consistent and heavily cached, because a briefly stale product price is not a real problem at all. Same system, two very different consistency bars, because the cost of being wrong is completely different on each side.

*Source: [07-Design-E-Commerce-Platform.md#6-whats-this-designs-core-trade-off-in-one-sentence](07-Design-E-Commerce-Platform.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [8. Design a Large File Upload System (e.g., a 5GB Video/Image Upload)](08-Design-Large-File-Upload.md)

### 1. Why should large file bytes never pass through your own application server?

**Answer:** Simple picture: your server should be a bouncer handing out passes, not a pipe the data flows through. Routing gigabytes through your own server ties up a request for the entire transfer, and makes your server's own bandwidth and memory the bottleneck for every concurrent upload. Instead, issue a short-lived presigned URL and let the client upload directly to object storage. Your server never touches the bytes — it only ever handles small control-plane requests.

*Source: [08-Design-Large-File-Upload.md#1-why-should-large-file-bytes-never-pass-through-your-own-application-server](08-Design-Large-File-Upload.md#1-why-should-large-file-bytes-never-pass-through-your-own-application-server)*

### 2. Why chunk the upload instead of sending the whole 5GB file in one request?

**Answer:** Rule of thumb: never let one failure cost you the whole transfer. Send a 5GB file in one request, and if it fails partway through — a very likely outcome over a real, unreliable network across a multi-hour transfer — you restart the entire thing from zero. Split it into independently-uploadable chunks instead, and a failure only costs you the one chunk that was in flight. This isn't even a workaround — object storage's own multipart upload APIs are explicitly built around this exact chunked shape.

*Source: [08-Design-Large-File-Upload.md#2-why-chunk-the-upload-instead-of-sending-the-whole-5gb-file-in-one-request](08-Design-Large-File-Upload.md#2-why-chunk-the-upload-instead-of-sending-the-whole-5gb-file-in-one-request)*

### 3. What's the actual difference between "resumable across a network drop" and "resumable across an app restart," and why does it matter which one you design for?

**Answer:** These sound similar but need very different work. Surviving a network drop only needs in-memory retry logic for the current session — nothing needs to be saved to disk. Surviving a full app restart or device reboot is a bigger promise: the client has to persist upload progress — which chunks are confirmed, their ETags — to durable local storage like IndexedDB, and reconcile that against the server's own record of confirmed chunks on resume. Saying out loud which of these two guarantees you're actually building for is a real, gradable design decision — not a detail to wave past.

*Source: [08-Design-Large-File-Upload.md#3-whats-the-actual-difference-between-resumable-across-a-network-drop-and-resumable-across-an-app-restart-and-why-does-it-matter-which-one-you-design-for](08-Design-Large-File-Upload.md#3-whats-the-actual-difference-between-resumable-across-a-network-drop-and-resumable-across-an-app-restart-and-why-does-it-matter-which-one-you-design-for)*

### 4. Why shouldn't file processing (virus scan, transcoding) happen synchronously as part of the upload-completion request?

**Answer:** Simple reason: some jobs take minutes, and HTTP requests don't get to wait minutes. Processing a large file — especially transcoding video — can genuinely take real minutes, far longer than any reasonable request timeout. So instead of doing that work inline, publish an event to a queue and let background workers process it asynchronously, while the client polls or subscribes for a status change. That's the only approach that doesn't force the upload-completion request to just hang for however long processing takes.

*Source: [08-Design-Large-File-Upload.md#4-why-shouldnt-file-processing-virus-scan-transcoding-happen-synchronously-as-part-of-the-upload-completion-request](08-Design-Large-File-Upload.md#4-why-shouldnt-file-processing-virus-scan-transcoding-happen-synchronously-as-part-of-the-upload-completion-request)*

### 5. How would you avoid re-uploading a multi-gigabyte file that's already been uploaded before (by anyone)?

**Answer:** Fingerprint the file before you send it. Compute a content checksum client-side before starting the upload, and check it against the checksums of files already stored. If it matches, skip the actual data transfer entirely and just point to the existing stored object. This is a genuinely valuable deduplication trick once you're operating at any meaningful scale.

*Source: [08-Design-Large-File-Upload.md#5-how-would-you-avoid-re-uploading-a-multi-gigabyte-file-thats-already-been-uploaded-before-by-anyone](08-Design-Large-File-Upload.md#5-how-would-you-avoid-re-uploading-a-multi-gigabyte-file-thats-already-been-uploaded-before-by-anyone)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** In one line: push the complexity to the client so the backend doesn't have to carry it. This design removes the application server from the file-transfer data path entirely. That trades a real amount of client-side complexity — chunking, resumability, presigned URL orchestration — for backend infrastructure that scales independently of how many large uploads are happening at once.

*Source: [08-Design-Large-File-Upload.md#6-whats-this-designs-core-trade-off-in-one-sentence](08-Design-Large-File-Upload.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [9. Design a Chat System (Slack/WhatsApp-style)](09-Design-Chat-System.md)

### 1. Why is delivering a chat message not as simple as "write to the recipient's socket"?

**Answer:** Here's the catch: in a horizontally-scaled fleet, the sender and recipient are almost certainly connected to two different gateway servers. The server handling the sender has no direct handle on the recipient's connection at all — it can't just "write to their socket" because it doesn't own that socket. What actually routes the message is a pub/sub layer sitting in the middle, keyed by recipient or by which gateway server they're connected to, that finds wherever that connection actually lives.

*Source: [09-Design-Chat-System.md#1-why-is-delivering-a-chat-message-not-as-simple-as-write-to-the-recipients-socket](09-Design-Chat-System.md#1-why-is-delivering-a-chat-message-not-as-simple-as-write-to-the-recipients-socket)*

### 2. Why must a message be persisted to durable storage before (or independently of) the real-time push attempt?

**Answer:** Simple rule: save it first, deliver it second. If persistence depended on the recipient being online right at that moment, an offline recipient would just lose messages sent while they were away — a serious, trust-breaking failure for any chat product. Persist the message first, and durability becomes unconditional — it doesn't depend on anyone being online. The real-time push then becomes a pure optimization for the common case where the recipient happens to be connected right then.

*Source: [09-Design-Chat-System.md#2-why-must-a-message-be-persisted-to-durable-storage-before-or-independently-of-the-real-time-push-attempt](09-Design-Chat-System.md#2-why-must-a-message-be-persisted-to-durable-storage-before-or-independently-of-the-real-time-push-attempt)*

### 3. How does the client correctly order messages that might arrive out of order over the network?

**Answer:** Never trust arrival order or a client-side clock — trust a number the server hands out. Each message carries a server-assigned sequence number that only ever goes up, per conversation. The client sorts and displays messages by that sequence number, not by the order they happened to arrive in, and not by a client-side timestamp — because network reordering and clock skew mean a timestamp can't be trusted to reflect the true send order.

*Source: [09-Design-Chat-System.md#3-how-does-the-client-correctly-order-messages-that-might-arrive-out-of-order-over-the-network](09-Design-Chat-System.md#3-how-does-the-client-correctly-order-messages-that-might-arrive-out-of-order-over-the-network)*

### 4. How is a chat group's message fan-out the same underlying problem as a social feed's celebrity fan-out?

**Answer:** Strip away the labels and it's the exact same shape of problem: deliver one piece of content to every member of a potentially large audience. A group's member list in chat, a celebrity's follower list in a feed — same shape. Both hit the same scaling cliff once the audience gets large, and both reach for the same fix: push-based delivery for smaller audiences, and a pull-based "fetch recent messages on demand" fallback once the audience is too big to fan out to individually in real time.

*Source: [09-Design-Chat-System.md#4-how-is-a-chat-groups-message-fan-out-the-same-underlying-problem-as-a-social-feeds-celebrity-fan-out](09-Design-Chat-System.md#4-how-is-a-chat-groups-message-fan-out-the-same-underlying-problem-as-a-social-feeds-celebrity-fan-out)*

### 5. What must the frontend do differently for a chat app's WebSocket connection compared to, say, a live feed's real-time channel?

**Answer:** For a feed, missing a "new content available" signal for a moment is low-stakes — nobody notices. For chat, it's a real bug, because message delivery is the whole promise of the product. So a chat client has to do more: reconnect automatically with backoff on disconnect, then reconcile exactly what was missed, using the last known sequence number. Skip that reconciliation step, and a dropped connection turns into lost messages the user can actually see.

*Source: [09-Design-Chat-System.md#5-what-must-the-frontend-do-differently-for-a-chat-apps-websocket-connection-compared-to-say-a-live-feeds-real-time-channel](09-Design-Chat-System.md#5-what-must-the-frontend-do-differently-for-a-chat-apps-websocket-connection-compared-to-say-a-live-feeds-real-time-channel)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** In one line: persistence is the promise, real-time is just the bonus. Durable persistence is the actual delivery guarantee here; the real-time push path is a best-effort optimization layered on top of it. So an offline recipient never loses a message — they just get it a little later, through the exact same durable path every message travels, whether or not anyone was online to receive it instantly.

*Source: [09-Design-Chat-System.md#6-whats-this-designs-core-trade-off-in-one-sentence](09-Design-Chat-System.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [10. Design Google Docs (Real-Time Collaborative Editor)](10-Design-Google-Docs-Collaborative-Editor.md)

### 1. Why can't concurrent edits just be applied to the document in whatever order they arrive at the server?

**Answer:** Here's the problem: each person typed against their own last-known version of the document, before seeing the other person's edit. Just applying both edits in the order they arrive lets their target positions collide — one edit assumed a document state that the other edit has since changed underneath it. Operational Transformation exists to fix exactly this: it adjusts, or "transforms," one operation's effect to account for the other's, so the final result comes out correct no matter which order the edits arrived in.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#1-why-cant-concurrent-edits-just-be-applied-to-the-document-in-whatever-order-they-arrive-at-the-server](10-Design-Google-Docs-Collaborative-Editor.md#1-why-cant-concurrent-edits-just-be-applied-to-the-document-in-whatever-order-they-arrive-at-the-server)*

### 2. What's the practical difference between OT and CRDTs, and why does Google Docs use OT specifically?

**Answer:** Simple way to tell them apart: OT needs a referee, CRDTs don't. OT transforms operations against each other through a central sequencing authority — typically the server. CRDTs skip the referee entirely: every element gets a stable identifier, so operations merge correctly in any order with no transformation step and no central authority. Google Docs already has a client-server architecture, so OT fits naturally and is comparatively lighter-weight there. CRDTs shine more in fully peer-to-peer or heavily offline-first systems, where there's no natural server around to act as that referee.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#2-whats-the-practical-difference-between-ot-and-crdts-and-why-does-google-docs-use-ot-specifically](10-Design-Google-Docs-Collaborative-Editor.md#2-whats-the-practical-difference-between-ot-and-crdts-and-why-does-google-docs-use-ot-specifically)*

### 3. How does offline editing get reconciled once a client reconnects?

**Answer:** Nice detail here: offline for an hour is handled by the exact same machinery as a normal 200ms network delay — no special case needed. While offline, the client just keeps composing local operations against its last-known version. On reconnect, it sends those operations to the server, which transforms them against every operation that landed while the client was disconnected. It's the same transformation logic either way; only the number of operations to transform against is bigger.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#3-how-does-offline-editing-get-reconciled-once-a-client-reconnects](10-Design-Google-Docs-Collaborative-Editor.md#3-how-does-offline-editing-get-reconciled-once-a-client-reconnects)*

### 4. Why must a remote collaborator's incoming edit adjust the local user's own cursor position?

**Answer:** Picture this bug: someone else inserts text right before your cursor, your cursor position doesn't move, and now it's silently pointing at completely different text than what you were actually looking at and about to type into. That's a real, highly visible bug, and it's one of the trickiest correctness details to get right in the whole system — every incoming remote edit has to shift the local cursor position to account for it.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#4-why-must-a-remote-collaborators-incoming-edit-adjust-the-local-users-own-cursor-position](10-Design-Google-Docs-Collaborative-Editor.md#4-why-must-a-remote-collaborators-incoming-edit-adjust-the-local-users-own-cursor-position)*

### 5. Why does this design store the full operation log instead of just the current document snapshot?

**Answer:** A snapshot only tells you where the document ended up. The operation log tells you the whole story of how it got there — which is exactly what makes version history and "who wrote this specific word" attribution possible. Without the log, a snapshot alone has no record of the journey, just the current state. The periodic snapshot still exists, but purely as a load-time shortcut, so a client doesn't have to replay the entire history from the document's creation every time it opens.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#5-why-does-this-design-store-the-full-operation-log-instead-of-just-the-current-document-snapshot](10-Design-Google-Docs-Collaborative-Editor.md#5-why-does-this-design-store-the-full-operation-log-instead-of-just-the-current-document-snapshot)*

### 6. What's this design's core trade-off, in one sentence?

**Answer:** In one line: hide hard algorithms behind the scenes so typing feels instant. This design takes on real algorithmic complexity — a correct OT implementation, cursor-position reconciliation on every incoming remote edit — in exchange for an editing experience with zero perceived latency. Every keystroke applies locally and instantly, while all the server-side reconciliation happens invisibly in the background.

*Source: [10-Design-Google-Docs-Collaborative-Editor.md#6-whats-this-designs-core-trade-off-in-one-sentence](10-Design-Google-Docs-Collaborative-Editor.md#6-whats-this-designs-core-trade-off-in-one-sentence)*

## [11. Design a URL Shortener (bit.ly / TinyURL)](11-Design-URL-Shortener.md)

### 1. Why is base62-encoding a unique ID generally preferred over hashing the long URL for generating short codes?

**Answer:** Simple reason: hashing can collide, counting can't. Hash the long URL, and two different URLs — or just an unlucky truncation — can produce the same short hash, which means you need explicit collision detection and retry logic. Base62-encode an auto-incrementing ID instead, and that ID is already guaranteed unique by construction. So the short code comes out unique with zero collision risk and no retry logic needed at all.

*Source: [11-Design-URL-Shortener.md#1-why-is-base62-encoding-a-unique-id-generally-preferred-over-hashing-the-long-url-for-generating-short-codes](11-Design-URL-Shortener.md#1-why-is-base62-encoding-a-unique-id-generally-preferred-over-hashing-the-long-url-for-generating-short-codes)*

### 2. Why does a single auto-incrementing counter become a real bottleneck, and what's the standard fix?

**Answer:** Here's the bottleneck: if every server has to contact the same central counter for every single new ID, you've just serialized all short-code generation across your entire fleet through one point of contention. The standard fix is batching: pre-allocate a chunk of IDs, say 10,000 at a time, to each server. That server then hands out IDs from its own local batch, and only goes back to the central counter once it runs low.

*Source: [11-Design-URL-Shortener.md#2-why-does-a-single-auto-incrementing-counter-become-a-real-bottleneck-and-whats-the-standard-fix](11-Design-URL-Shortener.md#2-why-does-a-single-auto-incrementing-counter-become-a-real-bottleneck-and-whats-the-standard-fix)*

### 3. What's the actual, consequential difference between using a 301 and a 302 redirect for a short link, and which would you pick?

**Answer:** Rule of thumb: 301 saves you server load, 302 saves you your analytics. A 301 tells the browser "this is permanent," so it caches the redirect — repeat clicks from that browser never hit your server again. Less load, but you lose visibility into those repeat clicks. A 302 never gets cached that way, so every single click reliably reaches your server, giving you accurate click analytics, at the cost of more redirect traffic. Since click analytics is usually a core feature of a URL shortener, 302 is the more common real-world choice.

*Source: [11-Design-URL-Shortener.md#3-whats-the-actual-consequential-difference-between-using-a-301-and-a-302-redirect-for-a-short-link-and-which-would-you-pick](11-Design-URL-Shortener.md#3-whats-the-actual-consequential-difference-between-using-a-301-and-a-302-redirect-for-a-short-link-and-which-would-you-pick)*

### 4. Why should click-count tracking never happen synchronously as part of the redirect response?

**Answer:** Simple rule: never make a user wait on your analytics. The redirect sits on the critical path of someone actually trying to get to their destination — adding a synchronous database write there just to track a click adds latency to something that should feel instant. Instead, increment the click count asynchronously — through a queue, or a buffered/batched write. The redirect stays fast no matter how the analytics write eventually gets processed.

*Source: [11-Design-URL-Shortener.md#4-why-should-click-count-tracking-never-happen-synchronously-as-part-of-the-redirect-response](11-Design-URL-Shortener.md#4-why-should-click-count-tracking-never-happen-synchronously-as-part-of-the-redirect-response)*

### 5. Why is a URL shortener's frontend unusually thin compared to the other scenarios in this folder?

**Answer:** Simple reason: the core feature has no frontend at all. The actual redirect — the thing most users interact with — is a raw server-issued HTTP redirect that the browser just follows, with zero client-side application running at that URL. The only real frontend surface left is the link-creation form, plus maybe an analytics dashboard, and that's a simple, low-stakes page compared to something like a chat client or a collaborative editor.

*Source: [11-Design-URL-Shortener.md#5-why-is-a-url-shorteners-frontend-unusually-thin-compared-to-the-other-scenarios-in-this-folder](11-Design-URL-Shortener.md#5-why-is-a-url-shorteners-frontend-unusually-thin-compared-to-the-other-scenarios-in-this-folder)*
