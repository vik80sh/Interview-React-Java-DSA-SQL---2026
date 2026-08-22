# Database Design for System Design Interviews

This file is the "which database, and how do I shape it for scale" layer — for SQL fundamentals themselves (joins, ACID, indexing mechanics, normalization), see the dedicated [Backend/Database folder](../Backend/Database/INDEX.md). Here, the question is always the system-design one: given this system's actual read/write pattern and consistency needs, what's the right choice, and how do you design the schema so it survives real scale.

## 1. The SQL vs NoSQL Decision, as an Actual Decision (Not a Slogan)

Ask three questions about the data, not about the technology:

1. **Does this data have real relationships that must stay consistent?** (An order references a user and line items; a payment must match a real order.) → Relational, so foreign keys and transactions can enforce it.
2. **Does the shape of each record vary a lot, or evolve unpredictably?** (A product catalog where a laptop has RAM/CPU and a T-shirt has size/color.) → Document store, so you're not fighting a rigid shared schema.
3. **Is this a single-key lookup with no relationships and extreme read/write volume?** (A session, a cache entry, a counter.) → Key-value store, purpose-built for exactly that access pattern.

| | Relational (Postgres/MySQL) | Document (MongoDB) | Key-Value (Redis/DynamoDB) | Wide-Column (Cassandra) |
|---|---|---|---|---|
| Best for | Data with real relationships and invariants | Flexible, evolving per-record schema | Single-key lookups, sessions, caching | Massive write throughput, time-series |
| Query flexibility | High (joins, aggregation) | Medium (per-document queries, limited joins) | Low (key lookup only) | Low-medium |
| Scaling writes | Hard (sharding required) | Easier (built for horizontal scale) | Easiest | Built for this specifically |
| Consistency | Strong (ACID) | Tunable, often eventual | Tunable | Eventual by default |

Full depth on this decision — with concrete scenarios for each database type — is in [Backend/Database's fundamentals guide](../Backend/Database/01-Database-Fundamentals-and-Choosing-One.md); this section is the compressed, system-design-interview version of that same reasoning.

## 2. Schema Design for Scale — Worked Example: a Social Feed

Take "design the schema for posts, likes, and comments" (a real recurring sub-question inside Twitter/Instagram-style prompts):

```sql
-- The naive version: correct, but a "how many likes does this post have" query
-- means COUNT(*) over a potentially huge likes table, every single time it's asked
CREATE TABLE posts (id BIGINT PRIMARY KEY, user_id BIGINT, content TEXT, created_at TIMESTAMP);
CREATE TABLE likes (post_id BIGINT, user_id BIGINT, created_at TIMESTAMP, PRIMARY KEY (post_id, user_id));
CREATE TABLE comments (id BIGINT PRIMARY KEY, post_id BIGINT, user_id BIGINT, content TEXT, created_at TIMESTAMP);
```

```sql
-- The scale-aware version: denormalize the COUNT onto the post itself
ALTER TABLE posts ADD COLUMN like_count BIGINT DEFAULT 0;
ALTER TABLE posts ADD COLUMN comment_count BIGINT DEFAULT 0;
-- updated via an application-level increment (or a queued async job) on every like/comment insert,
-- not recomputed with COUNT(*) on every single read of the post
```

This is the exact denormalization trade-off covered in the [Normalization guide](../Backend/Database/07-Normalization-and-Schema-Design.md#5-denormalization--breaking-the-rules-on-purpose-for-a-real-reason) — a fully normalized schema is technically "more correct" but means every post-list render pays a `COUNT(*)` per post; a denormalized counter trades a small amount of write complexity (keeping it in sync) for read performance that scales far better, which is the right call here because posts are read orders of magnitude more often than they're liked or commented on.

**Indexing decisions that actually matter at this scale:** `posts(user_id, created_at)` for "this user's own posts, newest first," and `posts(created_at)` alone almost never scales as *the* timeline query — a global feed sorted purely by time across everyone doesn't reflect who the viewer actually follows, which is why real feed generation (covered in the [Twitter design scenario](04-Design-Twitter-Social-Feed.md)) precomputes a per-user feed rather than querying `posts` directly at read time.

## 3. Designing Around a Document Store

```javascript
// A product document sized for how it'll actually be READ, not normalized for its own sake
{
  _id: "prod_123",
  name: "Wireless Headphones",
  price: 79.00,
  category: "electronics",
  attributes: { batteryLifeHours: 30 },  // varies by category — the reason to choose a document store at all
  reviewSummary: { averageRating: 4.5, count: 312 }  // denormalized summary, not the full review list
}
```

The system-design-specific judgment call here: embed data that's read together with its parent and won't grow unbounded (a review *summary*); reference (a separate collection) data that's large, grows unbounded, or is queried independently (the actual list of thousands of reviews, paginated separately). Getting this backwards — embedding an unbounded array — is a real, common mistake that works fine in a demo and breaks once a popular product accumulates thousands of reviews inside one document.

## 4. Read-Heavy vs Write-Heavy Design

**Read-heavy systems** (a social feed, a product catalog, a blog: 90%+ reads) get the most benefit from: aggressive caching (Redis in front of the database), read replicas, and precomputing expensive aggregations ahead of read time rather than computing them live on every request. The core idea: push cost from read time (which happens constantly) to write time or a background job (which happens far less often).

**Write-heavy systems** (an analytics/event-logging pipeline, a ride-hailing app's constant location pings) get the most benefit from: a message queue absorbing bursts so the database is never hit with the raw, spiky write rate directly, batched/buffered writes instead of one write per event, and a storage engine actually built for high write throughput (a wide-column store like Cassandra, or a time-series database) rather than a general-purpose relational database straining against its write ceiling.

Correctly identifying which category a given system falls into — and stating it out loud — is itself a meaningful part of a strong answer, since it justifies every caching/replication/sharding decision that follows from it.

## Interview Questions and Answers

### 1. How do you actually decide between a relational and a document database for a new system, without just picking a favorite?

**Answer:** Ask whether the data has real cross-entity relationships/invariants that need enforcing (favors relational), and whether individual records' shape varies a lot or evolves unpredictably (favors document). A system with strict relational integrity needs (orders, payments, inventory) points toward relational regardless of scale; a system with wildly varying per-record attributes (a multi-category product catalog) points toward a document store even at modest scale.

### 2. Why would you denormalize a like-count directly onto a post instead of always computing `COUNT(*)` on the likes table?

**Answer:** Posts are read far more often than they're liked, so a `COUNT(*)` aggregation on every single read multiplies an expensive operation by the read volume. Storing a running counter on the post itself moves that cost to write time (a small increment per like) instead of read time, which is the correct trade for a read-to-write ratio this skewed.

### 3. What's the real risk of embedding a "reviews" array directly inside a product document in MongoDB?

**Answer:** Embedding works fine while the array stays small, but a popular product can accumulate thousands of reviews, and every read of that product then loads the entire array along with it — and MongoDB documents have a hard size ceiling that an ever-growing embedded array can eventually hit. The fix is embedding only a small summary (average rating, count) and referencing the full review list as its own paginated collection.

### 4. What actually distinguishes a read-heavy system's scaling strategy from a write-heavy system's?

**Answer:** Read-heavy systems push cost from read time to write time or a background job — caching, read replicas, precomputed aggregations — because reads happen far more often and that's where the multiplier lives. Write-heavy systems instead need to absorb write bursts (a message queue), batch writes, and often a storage engine purpose-built for write throughput, because the bottleneck is the sheer rate of incoming writes, not the cost of any single read.

### 5. Why doesn't a single `posts(created_at)` index solve "generate my home feed"?

**Answer:** A global time-sorted index answers "what's newest across everyone," not "what's newest among the specific people I follow" — those are different queries with very different cost profiles once the follow graph is large. Real feed systems precompute a per-user feed ahead of time (a push/fan-out model) rather than trying to satisfy the personalized query directly against a single shared index at read time.

## Revision Checklist

- [ ] Choose between relational, document, key-value, and wide-column stores for a stated real system, justified by the actual data shape and access pattern.
- [ ] Design a schema for a social-feed-style feature, including where you'd deliberately denormalize and why.
- [ ] Explain the embed-vs-reference decision for a document store, and the failure mode of getting it backwards.
- [ ] Classify a given system as read-heavy or write-heavy and name the scaling techniques that follow from that classification.
