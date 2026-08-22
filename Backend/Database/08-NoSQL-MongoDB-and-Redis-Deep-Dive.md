# NoSQL in Practice: MongoDB and Redis

Knowing *when* to reach for NoSQL (covered in the [Fundamentals guide](01-Database-Fundamentals-and-Choosing-One.md)) is half the interview; a full-stack role often expects you to also know the two NoSQL databases you'll actually touch day to day — MongoDB as a document store, and Redis as a cache/session store — at a level deeper than "it's flexible" or "it's fast."

## 1. MongoDB — the Document Model

```javascript
// A product document — notice the nested, category-specific attributes, no rigid shared schema
{
  _id: ObjectId("64f1..."),
  name: "Wireless Headphones",
  price: 79.00,
  category: "electronics",
  attributes: { batteryLifeHours: 30, color: "black" }, // varies wildly by category
  reviews: [
    { user: "ana", rating: 5, comment: "Great sound" },
    { user: "ben", rating: 4, comment: "Good value" }
  ]
}
```

This single document holds the product **and** its reviews together — the direct contrast with the relational model from the [Fundamentals guide](01-Database-Fundamentals-and-Choosing-One.md), where reviews would live in their own table joined by a foreign key. Embedding like this is a deliberate MongoDB modeling choice: read the product page, and you get everything in **one** document fetch, no join required.

### Embedding vs Referencing — the real modeling decision

```javascript
// Embedded: fast to read together, but a review array that grows unbounded becomes a real problem
{ _id: 1, name: "Headphones", reviews: [ {...}, {...}, /* thousands more */ ] }

// Referenced: a separate collection, queried separately — the "join" MongoDB doesn't do natively
{ _id: 1, name: "Headphones" }
{ productId: 1, user: "ana", rating: 5 } // in a separate `reviews` collection
```

The real rule of thumb: embed data that's small, bounded, and almost always read together with its parent (an address on a user profile). Reference (split into a separate collection) data that's large, unbounded, or needs to be queried independently of its parent (thousands of reviews on a popular product, which you'd paginate rather than load all at once). MongoDB does support a `$lookup` aggregation stage that behaves like a join, but it's not the natural, indexed-by-default operation a SQL join is — reaching for `$lookup` constantly is often a sign the data actually wanted to be relational.

### Basic MongoDB Query Shapes

```javascript
db.products.find({ category: "electronics", price: { $lt: 100 } });
db.products.updateOne({ _id: 1 }, { $set: { price: 69.00 } });
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $group: { _id: "$category", avgPrice: { $avg: "$price" } } }
]);
```

`find` with a query filter is the rough equivalent of `SELECT ... WHERE`; `$set`/`updateOne` is the rough equivalent of `UPDATE`; the `aggregate` pipeline (`$match` → `$group` → ...) is the equivalent of `WHERE` + `GROUP BY`, expressed as a sequence of stages each transforming the documents flowing through it — worth recognizing even if you're not fluent in the exact syntax, since the *shape* of the question ("how would you get the average price per category in MongoDB") is really asking whether you understand the aggregation-pipeline mental model.

## 2. Redis — Data Structures, Not Just a Key-Value Cache

Redis is usually introduced as "a cache," but the more senior framing is that it's an in-memory data-structure server — the real interview differentiator is knowing which structure fits which real problem.

```text
SET session:abc123 "{\"userId\": 42}" EX 3600   -- string, with a TTL: a session that auto-expires
GET session:abc123

INCR page_views:home                             -- atomic counter — safe under concurrent requests
                                                  -- (no read-then-write race, unlike a naive app-level increment)

LPUSH recent_orders:user:42 "order:555"          -- list — a bounded "last N items" feed
LTRIM recent_orders:user:42 0 9                  -- keep only the 10 most recent

ZADD leaderboard 1500 "player:1"                  -- sorted set — real-time leaderboard, sorted by score
ZREVRANGE leaderboard 0 9                          -- top 10 players, already sorted, no app-side sorting needed

SADD tags:post:123 "java" "spring" "backend"      -- set — tag membership with O(1) "is this tag present" checks
```

Each structure maps to a real production use case: **strings with TTL** for sessions and cache entries, **`INCR`** for atomic counters (rate limiting, view counts) without the race condition a naive "read, add one, write" pattern has, **lists** for a bounded recent-activity feed, **sorted sets** for a leaderboard or a priority queue where you need "top N by score" without sorting in application code, and **sets** for fast membership checks (tags, feature flags a user has). Knowing `ZADD`/`ZREVRANGE` exist specifically for a leaderboard, rather than reaching for a plain key holding a JSON blob you'd have to sort yourself, is exactly the kind of specific knowledge that separates "I've used Redis as a cache" from "I know Redis."

### Cache-Aside With Redis — the Real Pattern

```java
public Product getProduct(Long id) {
    String cached = redis.get("product:" + id);
    if (cached != null) return deserialize(cached);       // cache hit

    Product product = productRepository.findById(id).orElseThrow();
    redis.set("product:" + id, serialize(product), Duration.ofMinutes(10)); // populate for next time
    return product;
}
```

This is the same cache-aside pattern covered in depth (including stampede protection and invalidation strategy) in the [Common Backend Problems guide](../Springboot/07-Common-Backend-Problems.md#1-caching) — Redis is the concrete, real-world tool most often sitting behind that abstract pattern.

## Interview Questions and Answers

### 1. Why would you embed reviews inside a product document in MongoDB instead of a separate collection, and when would that choice backfire?

**Answer:** Embedding means one document fetch returns the product and its reviews together, with no join needed — ideal when the data is read together and bounded in size. It backfires once the embedded array grows unbounded (thousands of reviews), since every read of the product now also loads all of that array, and MongoDB documents have a hard size limit (16MB) that an ever-growing embedded array can eventually hit.

### 2. How is MongoDB's aggregation pipeline conceptually similar to SQL's `WHERE` + `GROUP BY`?

**Answer:** `$match` filters documents the same way `WHERE` filters rows, and `$group` collapses documents into per-key summaries the same way `GROUP BY` does with aggregate functions — the pipeline is just that same logical operation expressed as a sequence of explicit transformation stages instead of a single declarative statement.

### 3. Why is Redis's `INCR` safer for a view counter than reading the current value, adding one, and writing it back from your application?

**Answer:** `INCR` is a single atomic operation on the Redis server, so concurrent requests can't both read the same stale value and overwrite each other's increment — exactly the lost-update race condition described in the [ACID guide](04-ACID-Properties-and-Transactions.md#i--isolation-concurrent-transactions-shouldnt-see-each-others-half-finished-work). A naive read-then-write in application code has no such guarantee under concurrent traffic.

### 4. Why is a Redis sorted set (`ZADD`/`ZREVRANGE`) the right structure for a leaderboard instead of a plain string holding JSON?

**Answer:** A sorted set keeps its members ordered by score automatically, so retrieving the top N is a direct, fast range query (`ZREVRANGE`) with no sorting done in application code on every read. A plain JSON blob would require deserializing and sorting the entire leaderboard on every single request, which doesn't scale the same way.

### 5. What's the real difference between how a full-stack engineer should talk about Redis as "just a cache" versus what it actually is?

**Answer:** Redis is an in-memory data-structure server, not merely a key-value cache — strings, lists, sets, sorted sets, and hashes each map onto specific real problems (sessions, bounded feeds, tag membership, leaderboards) that would otherwise need extra application-side logic to replicate. Framing it as "just a cache" misses that several of these use cases have nothing to do with caching a database read at all.

## Revision Checklist

- [ ] Decide between embedding and referencing for a real MongoDB modeling scenario, and name the size/query-pattern trade-off.
- [ ] Write a basic MongoDB `find`/`update`/`aggregate` and explain its rough SQL equivalent.
- [ ] Match a real problem (session, counter, feed, leaderboard, tag check) to the correct Redis data structure.
- [ ] Explain why `INCR` avoids the lost-update race a naive app-level counter has.
- [ ] Implement cache-aside with Redis and connect it to the caching pattern in the Common Backend Problems guide.
