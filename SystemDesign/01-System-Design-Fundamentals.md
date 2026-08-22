# System Design Fundamentals

System design interviews aren't testing whether you know what a load balancer is — they're testing whether you can navigate a genuinely open-ended problem with the same structure every time, ask the right clarifying questions, and defend a trade-off out loud. This file gives you that structure once, and every scenario file in this folder (05 through 08, plus the classics in 04) follows it exactly, so you walk into any "design X" question already knowing your first move.

## 1. The Reusable Interview Template

Use these eight steps, in this order, for every system design question you're ever asked. The value isn't in memorizing eight names — it's that following the same order every time means you never freeze on "what do I even say first."

1. **Clarify requirements.** Split into functional ("what must the system do") and non-functional ("how well must it do it — scale, latency, availability, consistency"). Ask 3-5 real questions before designing anything; assuming instead of asking is the single most common way candidates lose points early.
2. **Estimate scale.** Daily active users → queries per second → storage → bandwidth. These numbers aren't decoration — they determine every choice that follows (a system doing 50 QPS doesn't need sharding; one doing 500,000 QPS can't avoid it).
3. **Define the core API and data model.** A handful of endpoints (or method signatures) and the 3-5 entities they operate on. This forces you to commit to what the system actually stores before you draw boxes.
4. **Draw the high-level architecture.** Client → load balancer → services → cache → database → (queue, CDN — Content Delivery Network, covered in depth in [file 02](02-Scalability-Load-Balancing.md#2-content-delivery-networks-cdns--moving-data-physically-closer-to-users) — search index as needed). Narrate it as you draw — this is the "boxes and arrows" phase interviewers expect to see.
5. **Deep-dive the 1-2 genuinely hard backend parts.** This is where the interview is actually won or lost — every system has a specific problem that makes it interesting (Twitter's feed fanout, Uber's geospatial matching, a file upload's resumability). Spend most of your remaining time here, not re-explaining the parts that are the same in every system.
6. **Address the frontend/client perspective.** Most candidates only design the backend and get caught flat when asked "and what does the client actually do?" — see the frontend checklist below; this is a genuinely separate, scoreable part of the answer, not an afterthought.
7. **Identify bottlenecks and their trade-offs.** Name what breaks first as load grows, and the fix's actual cost (more consistency lag, more operational complexity, more money).
8. **Summarize the trade-off in one sentence.** "This design favors availability over strict consistency because a stale like-count is fine, but a failed feed load isn't." A crisp closing line is what a strong candidate says that a mediocre one doesn't.

Every scenario file in this folder is organized around exactly these eight headers. Once you've done this five or six times, you stop thinking about the template consciously — that's the actual goal.

### The frontend checklist (step 6, every time)

A frontend engineer asked a system design question is very often specifically being evaluated on whether they cover this step at all, since many backend-leaning candidates skip it entirely. Run through the same short checklist every time:

- **Rendering strategy** — does this page/screen need CSR, SSR, or SSG (see the [SSR/CSR/Next.js guide](../Frontend/React/11-SSR-CSR-and-Nextjs.md) for the full trade-off), and why for this specific screen?
- **Real-time channel, if any** — WebSocket (bidirectional, persistent — chat, collaborative editing), Server-Sent Events (one-directional server-to-client — live notifications, a live feed), or plain polling (simplest, acceptable when near-real-time is fine)? Name which one and why.
- **Optimistic UI** — does the client update immediately and reconcile with the server after (a like button, a sent chat message), or must it wait for server confirmation (a payment)? This is almost always a deliberate, statable choice, not an accident.
- **Client-side state and caching** — what lives in local component state, what's fetched and cached (React Query/SWR-style), and what's shared global state (see the [State Management guide](../Frontend/React/08-State-Management-Context-Redux-Zustand.md))?
- **Failure/offline handling** — what does the UI do when a request fails or the network drops mid-action (a queued retry, a visible error, a locally-persisted draft)?

## 2. Capacity Estimation — the Formulas You Actually Reuse Every Time

```text
Daily Active Users (DAU)   = total registered users × activity rate
Queries Per Second (QPS)   = DAU × actions per user per day / 86,400 seconds
Peak QPS                   = average QPS × 2-3 (peak-hour multiplier)
Storage per year           = DAU × data per user per day × 365
Bandwidth                  = peak QPS × average request/response size
Cache size (80/20 rule)    = total hot dataset ≈ 20% of total data
```

Worked example: a ride-hailing app with 100M registered users, 20% daily activity, and each active user triggering ~5 location-relevant requests per minute while using the app for ~15 minutes a day.

- DAU = 100M × 20% = 20M
- Requests per DAU per day ≈ 5/min × 15 min = 75
- Average QPS = 20M × 75 / 86,400 ≈ 17,400 QPS
- Peak QPS (3x for rush hour) ≈ 52,000 QPS

The exact numbers matter less than showing you can derive them live and that you understand *why* peak QPS — not average — is what you actually design capacity for. A system provisioned for the average will fall over precisely when it matters most.

## 3. CAP Theorem — What It Actually Constrains

In a distributed system, you cannot simultaneously guarantee all three of:

- **Consistency** — every node returns the same, most-recent value for the same read.
- **Availability** — every request gets a response (even if that data might be stale).
- **Partition tolerance** — the system keeps working when a network partition splits nodes from each other.

The practical reading: network partitions **will** happen in any real distributed system, so the actual choice is between **CP** (refuse to answer during a partition rather than risk returning stale/wrong data — traditional relational databases with synchronous replication) and **AP** (keep answering during a partition, accepting that some nodes might briefly disagree — DynamoDB, Cassandra). Nothing forces this choice application-wide: a ride-hailing app can be CP for payments and AP for driver location updates in the very same system, because those two features have genuinely different tolerance for staleness.

| System aspect | Choose CP when... | Choose AP when... |
|---|---|---|
| Bank account balance | A stale balance could mean double-spending | — |
| Social media like count | — | A count off by a few for a moment is invisible to users |
| Inventory count at checkout | Overselling a sold-out item is a real business problem | — |
| Driver's live GPS pin | — | A few-second-stale pin is still useful, and always-available matters more |

## 4. ACID vs BASE — Two Different Bets on Where Correctness Lives

**ACID** (Atomicity, Consistency, Isolation, Durability — the full breakdown, with real transfer-failure examples for each letter, lives in the [Database ACID guide](../Backend/Database/04-ACID-Properties-and-Transactions.md)) is the traditional relational database's bet: the database itself enforces correctness through transactions and constraints, at the cost of being harder to scale horizontally.

**BASE** (Basically Available, Soft state, Eventually consistent) is the bet most horizontally-scaled NoSQL systems make instead: the database stays available and fast even during a partition, and it's the *application's* job to tolerate or reconcile temporary disagreement between replicas. Reach for it deliberately — for data where staleness is genuinely tolerable (a follower count, a "last seen online" timestamp) — not as a default just because it scales further.

## 5. Vertical vs Horizontal Scaling

**Vertical (scale up)** means a bigger machine — more CPU, more RAM. It's simpler (nothing to coordinate) and has lower latency (no extra network hop), but it has a hard ceiling (you can't buy an infinitely large machine) and remains a single point of failure. It's the right first move for a database before reaching for the real complexity of sharding.

**Horizontal (scale out)** means more machines behind a load balancer. It scales further and removes the single point of failure, but introduces real coordination cost — session handling, cache coherency, and eventually a database that can't just be one bigger box either. Most real systems scale their stateless web/API tier horizontally almost immediately (it's cheap and low-risk) and delay horizontally scaling the database (sharding) as long as possible, because sharding is where genuine complexity — cross-shard joins, cross-shard transactions, re-sharding — shows up.

## 6. The Three-Way Trade-off: Consistency, Availability, Latency

You can't maximize all three simultaneously, and naming which two you're prioritizing — out loud, with a reason — is exactly what separates a strong system design answer from a list of technology names:

| Priority | Real system | Why |
|---|---|---|
| Consistency > Availability > Latency | Banking, payments | Money appearing twice or vanishing is worse than the system being briefly unavailable |
| Availability > Latency > Consistency | Social media feeds | Always-on matters more than every user seeing the exact same feed instantly |
| Latency > Availability > Consistency | Search, autocomplete | Users tolerate a slightly stale index; they don't tolerate a slow response |

## Interview Questions and Answers

### 1. Explain the CAP theorem, and why "choose 2 of 3" is a slight oversimplification.

**Answer:** CAP says a distributed system can't simultaneously guarantee consistency, availability, and partition tolerance. Since network partitions are a real, unavoidable fact of distributed systems, the practical choice is between CP (refuse some requests during a partition to protect consistency) and AP (keep answering, accepting temporary disagreement). It's a slight oversimplification because the choice doesn't have to be made once for the whole system — different features within the same application can make different CP/AP choices based on their own tolerance for staleness.

### 2. When would you choose ACID over BASE, and vice versa?

**Answer:** ACID when a specific piece of data has a real invariant that must never be violated even under concurrent access — an account balance, an inventory count at checkout. BASE when a system needs to stay available and fast under massive horizontal scale, and the specific data involved can tolerate being briefly stale — a follower count, a view counter, a cached recommendation list.

### 3. How do you estimate the QPS a system needs to handle, and why use peak instead of average?

**Answer:** Multiply daily active users by actions per user per day, divide by seconds in a day to get average QPS, then multiply by a peak factor (commonly 2-3x) to account for non-uniform traffic across the day. A system sized for the average will fail exactly when it matters most — during the actual peak — so real capacity planning targets peak QPS with an additional safety margin, not the average.

### 4. Vertical vs horizontal scaling — how do you decide which to reach for first?

**Answer:** Vertical scaling first for anything stateful and hard to distribute, like a single database, because it's simpler and has no coordination cost, up until its ceiling. Horizontal scaling for anything stateless that needs to scale further than one machine can handle, like web/API servers, since the coordination cost (load balancing, no shared local state) is manageable and the benefit (near-unlimited scaling, no single point of failure) is worth it early.

### 5. Why does the "right" trade-off between consistency, availability, and latency depend entirely on the system?

**Answer:** Each of the three costs something different, and different systems have genuinely different tolerances for those costs — a bank cannot tolerate inconsistent balances even briefly, while a social feed can tolerate a few seconds of staleness far more easily than it can tolerate being unavailable. There's no universally "correct" choice; there's only the choice that matches what the specific system's users actually need.

### 6. What's the first thing you should do when given an open-ended "design X" prompt?

**Answer:** Ask clarifying questions to pin down functional and non-functional requirements — scale, latency expectations, consistency needs, and which features actually matter for this conversation — before drawing anything. Designing before clarifying risks spending the whole interview solving a version of the problem the interviewer didn't actually ask about.

## Revision Checklist

- [ ] Recite the 7-step template from memory and explain why the order matters.
- [ ] Derive DAU → QPS → peak QPS → storage → bandwidth for a made-up scale, live, without notes.
- [ ] Explain CAP theorem's practical CP-vs-AP framing, and give a real feature-level example of choosing differently within the same app.
- [ ] Explain ACID vs BASE with a real example of when each is the right bet.
- [ ] Justify vertical vs horizontal scaling for a stated real component (a database vs a web server tier).
- [ ] State a consistency/availability/latency trade-off in one clear sentence for at least three different real systems.
