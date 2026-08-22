# Design a URL Shortener (bit.ly / TinyURL)

Same [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). This is probably the single most commonly asked "first" system design question, precisely because it looks trivial and isn't — the real interview signal is whether you can generate short codes correctly under concurrency across multiple servers, and whether you understand that the redirect path (read) and the shorten path (write) have almost nothing in common as workloads.

## 1. Clarify Requirements

**Functional:** given a long URL, generate a short one; given a short URL, redirect to the original long URL; optionally support a custom alias and an expiration date.

**Non-functional:** What's the read/write ratio? (Extremely read-heavy — a link is created once and clicked many times, often 100:1 or higher.) How fast must a redirect be? (As close to instant as possible — a slow redirect is a uniquely visible kind of slow, since the user is actively waiting mid-navigation.) Do short codes need to be unpredictable/non-guessable, or just unique? (Usually just unique — "unguessable" is a different, security-flavored requirement worth asking about explicitly rather than assuming.)

## 2. Estimate Scale

- 100M new short URLs created per month → roughly 40 writes/second average.
- Assume a 100:1 read:write ratio (clicks vastly outnumber creations) → roughly 4,000 reads/second average, higher at peak.
- Storage: each mapping is small (~500 bytes including metadata) — 100M/month × 500 bytes ≈ 50 GB/month, trivial to store even over years, since this is one of the rare systems where storage volume is a non-issue and the actual constraints are elsewhere (generation correctness, redirect latency).

## 3. Core API and Data Model

```text
POST /shorten   {longUrl, customAlias?, expiresAt?}   → {shortUrl}
GET  /{shortCode}                                       → 301/302 redirect to the long URL
```

```sql
urls(short_code PK, long_url, created_at, expires_at, click_count)
```

A single, simple table — this system's difficulty is almost entirely in the short-code *generation* strategy and the redirect path's performance, not the schema.

## 4. High-Level Architecture

```text
Client → Load Balancer → API servers → Cache (Redis: short_code → long_url) → Database
                                                                          │
                                                                          └─→ (async) Analytics/click tracking
```

The redirect path (`GET /{shortCode}`) is designed to be servable almost entirely from cache — this is the whole architectural story for the read side of this system.

## 5. Deep Dive 1: Generating Unique Short Codes Under Concurrency

**Approach A — hash and truncate:** hash the long URL (MD5/SHA-256) and take the first 6-8 characters. Simple, but two different long URLs can produce colliding truncated hashes, and the same long URL submitted twice produces the same code (which may or may not be desired) — collisions need an explicit detection-and-retry step, adding real complexity for something meant to be simple.

**Approach B — random generation + collision check:** generate a random 6-8 character base62 string, check if it's already taken, retry if so. Simple and avoids the "same input, same output" issue, but the collision-check-then-insert step is itself a race condition under concurrency (two servers could both check the same free code and both try to claim it) unless the insert uses a database unique constraint as the actual enforcement, with the application-level check purely as an optimization to reduce (not eliminate) retries.

**Approach C — the real production answer: base62 encoding of a unique, monotonically assigned ID.** Get a globally unique integer ID first (a database auto-increment, or a pre-allocated ID-range approach for multiple servers — see below), then encode that integer in base62 (`0-9A-Za-z`, 62 characters) to produce a short, unique-by-construction string with zero collision risk and no retry logic needed at all.

```text
Base62 encoding, the actual mechanism:
  id = 125,000,000  →  repeatedly divide by 62, using the remainder as an index into
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  → a 6-7 character code

Why base62 specifically: it's the largest character set that stays URL-safe without any
special-character encoding — more characters per position means shorter codes for the
same ID range than a smaller alphabet (like base36) would produce.
```

**The real distributed-systems wrinkle:** if IDs come from a single auto-incrementing database counter, that counter itself becomes a write bottleneck and single point of contention once you're running multiple API servers. The standard fix is a **pre-allocated ID range per server**: each server, on startup (or when it runs low), requests a batch of, say, 10,000 IDs from a central counter service in one call, then hands out IDs from that local batch without contacting the central counter again until the batch is exhausted. This trades a small amount of ID-space "waste" (unused IDs if a server crashes mid-batch) for removing per-request contention on a single shared counter entirely — the same batching principle behind connection pooling and buffered writes elsewhere in system design.

## 6. Deep Dive 2: Making the Redirect Path Fast and Highly Available

A redirect is on the critical path of a user's actual navigation — they clicked a link and are waiting for the browser to get somewhere, so this specific read path deserves more design attention than "just query the database."

```text
GET /{shortCode}:
  1. Check Redis cache for shortCode → longUrl  (the overwhelming majority of requests stop here)
  2. On cache miss: query the database, populate the cache, then redirect
  3. Increment click_count asynchronously (a message queue, or a buffered/batched write) —
     never on the synchronous critical path of the redirect itself
```

**301 vs 302 — a genuinely consequential, frequently-quizzed detail:** a `301 Permanent Redirect` tells the browser (and search engines) this mapping will never change, and browsers are allowed to cache that redirect locally, meaning *future* clicks on that same short link from that same browser never even hit your server again. A `302 Found` (temporary) is never cached the same way, so every click reliably reaches your server — which is exactly what you need if you want accurate click analytics for every single click, not just the first one per browser. This is a real, deliberate trade-off between server load (301 reduces it) and analytics completeness (302 preserves it), and stating which one you'd choose and why is a strong, specific answer.

## 7. Frontend Perspective

This is the one file in this folder with an unusually thin traditional frontend, and that's itself worth stating explicitly rather than skipping over: the redirect endpoint (`GET /{shortCode}`) is hit directly by the browser as a raw HTTP navigation — there's no client-side app running at that URL at all, no React tree to mount, just a server-issued redirect header. The only real UI surface is the link-creation page:

- **Rendering strategy:** the shorten-a-link form is a simple, mostly-static page — SSR/SSG is fine, though this is a low-stakes choice here since the page has essentially no personalization or SEO stakes either way.
- **UX details worth naming:** immediate copy-to-clipboard for the generated short link, and client-side validation of the submitted long URL (a real URL format) before ever hitting the server, as a fast first-pass check — with server-side validation still authoritative.
- **No real-time channel needed** — link creation is a simple request/response; there's nothing here that benefits from a persistent connection.
- **Analytics dashboard (if in scope):** a page showing click counts/trends for a user's own links is a standard read-heavy, cacheable dashboard, no different in kind from any other analytics UI.

## 8. Bottlenecks and Trade-offs

- **A single auto-increment counter as a write bottleneck** — solved by pre-allocated ID batches per server, trading a small amount of unused ID space for eliminating per-request contention.
- **Cache miss stampede on a suddenly-viral link** — a short link that goes viral can see a burst of cache misses if it somehow gets evicted; a long TTL (Time To Live — how long a cached entry stays valid before it expires) and cache warming on creation (populate the cache immediately when the link is created, not only on first read) avoids this in practice.
- **301 vs 302** — the redirect-caching trade-off from the deep dive above: less server load and faster subsequent clicks, versus complete click-through analytics. Most production URL shorteners choose 302 specifically because click analytics is a core product feature, not an afterthought.
- **Abuse/rate limiting** — a URL shortener is a real target for spam/phishing link generation at volume; rate-limiting the creation endpoint per user/IP is a necessary, often-overlooked piece of this design.

## Interview Questions and Answers

### 1. Why is base62-encoding a unique ID generally preferred over hashing the long URL for generating short codes?

**Answer:** Hashing requires explicit collision detection and retry logic, since two different long URLs (or an unlucky truncation) can produce the same short hash. Base62-encoding a value that's already guaranteed unique by construction (an auto-incrementing ID) produces a unique short code with zero collision risk and no retry logic needed at all.

### 2. Why does a single auto-incrementing counter become a real bottleneck, and what's the standard fix?

**Answer:** Every server needing a new ID would have to contact the same central counter on every single creation request, serializing all short-code generation across the entire fleet through one point of contention. The fix is pre-allocating a batch of IDs (e.g. 10,000 at a time) to each server, which then hands out IDs from its own local batch without touching the central counter again until it runs low.

### 3. What's the actual, consequential difference between using a 301 and a 302 redirect for a short link, and which would you pick?

**Answer:** A 301 lets browsers cache the redirect, so repeat clicks from the same browser never hit your server again — less load, but you lose visibility into those repeat clicks. A 302 is never cached that way, so every single click reliably reaches your server, giving accurate click analytics at the cost of more redirect traffic. Since click analytics is usually a core feature of a URL shortener product, 302 is the more common real-world choice.

### 4. Why should click-count tracking never happen synchronously as part of the redirect response?

**Answer:** The redirect is on the critical path of a user's actual navigation, waiting to get to their destination — adding a synchronous database write for analytics on that path adds latency to something that should be as close to instant as possible. Incrementing the click count asynchronously (a queue, or a buffered/batched write) keeps the redirect itself fast regardless of how the analytics write is eventually processed.

### 5. Why is a URL shortener's frontend unusually thin compared to the other scenarios in this folder?

**Answer:** The actual redirect — the core functionality most users interact with — is a raw server-issued HTTP redirect that the browser follows directly, with no client-side application running at that URL at all. The only meaningful frontend surface is the link-creation form (and optionally an analytics dashboard), which is a simple, low-stakes page by comparison to something like a chat client or a collaborative editor.

## Revision Checklist

- [ ] Walk through all 8 template steps for a URL shortener unprompted.
- [ ] Compare hash-based, random, and counter-based short-code generation, and justify why counter-based (base62) is the strongest default.
- [ ] Explain the pre-allocated ID batch fix for a shared counter's contention problem.
- [ ] Explain the 301 vs 302 trade-off precisely (browser caching vs click analytics) and justify a choice.
- [ ] Explain why click tracking must be asynchronous relative to the redirect itself.
- [ ] Explain why this scenario's frontend surface is unusually thin, and what little of it there is.
