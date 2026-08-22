# Scalability and Load Balancing

Every "deep dive" step in the system design template eventually runs into the same underlying question: this one component is now a bottleneck — what specifically do you do about it? Load balancers, CDNs, replication, and sharding are the four real answers, and knowing which one fits which bottleneck (not just their definitions) is what this file is for.

## 1. Load Balancing — Distributing Traffic Across Many Servers

A load balancer sits in front of a fleet of identical stateless servers and routes each incoming request to one of them, so no single server has to handle the entire traffic load and a server going down doesn't take the whole system with it.

**Algorithms, and when each one actually fits:**

| Algorithm | How it picks | Best for |
|---|---|---|
| Round robin | Cycles through servers in order | Servers with roughly equal capacity and uniform request cost |
| Least connections | Sends to whichever server has the fewest active connections | Requests with widely varying processing time (some fast, some slow) |
| Weighted round robin | Round robin, but bigger servers get proportionally more requests | A mixed fleet of different-sized machines |
| IP hash / consistent hash | Routes the same client to the same server based on a hash of their IP | When you need the same client to reliably land on the same server without a shared session store |

**Layer 4 vs Layer 7:** a Layer 4 (transport-layer) load balancer routes based on IP and port alone — fast, but blind to what's actually in the request. A Layer 7 (application-layer) load balancer reads the actual HTTP request — path, headers, cookies — and can route `/api/video/*` to one fleet and `/api/search/*` to another, or route based on a user's auth cookie. Most real production load balancers (ALB, NGINX, HAProxy) operate at Layer 7 specifically because that routing intelligence is usually worth the small extra overhead.

**The sticky-session problem:** if a server keeps a user's session data only in its own local memory, that user must always be routed back to the *same* server, or their session data isn't there — "sticky sessions." This defeats a load balancer's whole purpose during a server failure (the user's session is lost with it) and complicates scaling (that one server can't be drained for maintenance without logging users out). The real fix is moving session state out of individual servers entirely — into Redis, a database, or a signed client-side token (a JWT) — so any server can handle any request statelessly. This is exactly the reasoning behind [Spring Boot's stateless JWT-based security config](../Backend/Springboot/04-Authentication-Security.md#3-sessions-and-tokens): statelessness is what makes horizontal scaling actually simple.

## 2. Content Delivery Networks (CDNs) — Moving Data Physically Closer to Users

A CDN is a network of geographically distributed servers ("edge locations" or "points of presence") that cache content close to where users actually are, so a user in Mumbai gets a response from an edge server in Mumbai instead of round-tripping to an origin server in Virginia.

```text
Without a CDN:  User (Mumbai) ──────────────────────► Origin server (Virginia)
                 200ms+ round trip, every single request

With a CDN:      User (Mumbai) ──► Edge server (Mumbai) ──[cache miss only]──► Origin (Virginia)
                 ~10ms for a cache hit; the expensive trip happens rarely, not per request
```

CDNs are the right tool specifically for content that's the same for every user and doesn't change often — static assets (JS/CSS bundles, images), video segments, and increasingly, cacheable API responses via edge caching rules. They're the wrong tool for genuinely personalized, frequently-changing data (a user's private inbox), since caching that would either serve stale/wrong data to the wrong person or provide no cache-hit benefit at all because nobody else requests the exact same thing.

## 3. Database Replication — Scaling Reads, Protecting Against Failure

**Primary-replica (master-slave) replication** — one primary database accepts all writes; one or more replicas receive a continuous copy of those writes and serve read traffic. This is the standard first move once a single database's read load becomes the bottleneck (a very common real pattern: 95% reads, 5% writes, so adding read replicas directly attacks the larger share of the load).

The real trade-off: **replication lag** — a replica's data is always slightly behind the primary's, because replication takes some nonzero time. This means a user who just wrote data and immediately reads it back might read from a replica that hasn't caught up yet and see their own write appear to have vanished — a real, user-visible bug class. The fix is routing that specific "read your own write" case back to the primary (or a replica known to be caught up) rather than a random replica, not eliminating replication lag altogether, which usually isn't fully avoidable at scale.

## 4. Database Sharding — Scaling Writes, the Genuinely Hard Scaling Step

Where replication copies the *same* data to multiple machines, **sharding** splits *different* data across multiple machines — each shard holds a disjoint subset of rows, and together they hold the whole dataset. This is what actually scales write throughput past what a single machine can do, because writes to different shards can happen fully in parallel on different hardware.

**Sharding key choice is the single most consequential decision:** shard by `user_id` and a user's own queries stay fast (their data is all in one shard), but "find all orders placed today across every user" now has to query every shard and merge results. This trade-off — most queries fast, some queries genuinely hard — is unavoidable once you shard, and choosing the shard key means choosing which category of query you're willing to make harder.

```text
Consistent hashing (the common shard-assignment strategy):
  hash(user_id) % number_of_shards → which shard owns this user's data

Real cost of RE-sharding (adding a shard later):
  With plain modulo hashing, adding one shard reshuffles almost every key's assignment.
  Consistent hashing minimizes this — adding a shard only moves the keys that land in the
  new shard's specific range, not the entire dataset. This is why real systems use consistent
  hashing (or a similar scheme) rather than plain modulo, despite modulo being simpler to explain.
```

Cross-shard joins and cross-shard transactions are the two capabilities sharding takes away cleanly — a design that needs frequent joins across what would become two different shards is a strong signal that the chosen shard key (or the decision to shard at all, yet) needs reconsidering.

## 5. High Availability — Removing Every Single Point of Failure

**Redundancy** means no single component's failure takes the whole system down — multiple load balancer instances (behind a DNS-level or virtual-IP failover), multiple app servers, a primary database with a standby ready to be promoted, replicated storage. **Failover** is the mechanism that detects a failure and redirects traffic away from the failed component, usually via health checks (a component that stops responding to health checks gets removed from rotation automatically) — this is the direct link between "redundancy exists" and "the system actually stays up when something fails," since redundant components that nothing ever fails over to are just idle cost.

## Interview Questions and Answers

### 1. Why is Layer 7 load balancing generally preferred over Layer 4 despite the extra overhead?

**Answer:** Layer 7 can read the actual HTTP request content — path, headers, cookies — and route intelligently based on it (different services per path, session-aware routing, A/B testing by header), which Layer 4's IP-and-port-only view can't do at all. The small extra processing cost is almost always worth the routing flexibility it buys.

### 2. What problem do sticky sessions create, and what's the real fix?

**Answer:** If session data lives only in one server's local memory, that user must always be routed back to that exact server, which breaks if the server fails and complicates draining a server for maintenance. The real fix is removing session state from individual servers entirely — a shared store like Redis, or a self-contained signed token like a JWT — so every server is stateless and any of them can serve any request.

### 3. What's replication lag, and what real bug does it cause?

**Answer:** It's the delay between a write landing on the primary database and that write propagating to a read replica. The real bug: a user who just wrote data and immediately reads it back can hit a replica that hasn't caught up yet, making their own write appear to have vanished — fixed by routing that specific read back to the primary, not by trying to eliminate replication lag entirely.

### 4. What's the real difference between replication and sharding, and when do you need each?

**Answer:** Replication copies the same full dataset to multiple machines, scaling read throughput and adding failure redundancy. Sharding splits the dataset into disjoint pieces across multiple machines, scaling write throughput because different shards can be written to in parallel. Most systems add read replicas first (cheaper, simpler) and only shard once write throughput itself — not just read throughput — becomes the bottleneck.

### 5. Why does the choice of shard key matter so much, and what's the real cost of getting it wrong?

**Answer:** The shard key determines which queries stay fast (anything scoped to one shard's key) and which become expensive (anything that has to query and merge results across every shard). Getting it wrong doesn't just mean slower queries — cross-shard joins and multi-shard transactions become genuinely hard to support correctly at all, so the choice is close to irreversible without a real data migration.

### 6. Why is consistent hashing preferred over plain modulo hashing for shard assignment?

**Answer:** With plain modulo (`hash(key) % N`), adding or removing a single shard changes the modulo result for almost every key, forcing a near-total data reshuffle. Consistent hashing assigns keys to positions on a hash ring such that adding or removing a shard only moves the keys that specifically fall into the changed portion of the ring, making re-sharding a much smaller, more tractable operation.

## Revision Checklist

- [ ] Choose the right load-balancing algorithm for a stated real traffic pattern.
- [ ] Explain the sticky-session problem and the statelessness fix.
- [ ] Explain when a CDN helps and when it doesn't (personalized vs shared content).
- [ ] Explain replication lag and the "read your own write" bug it causes, plus the fix.
- [ ] Explain sharding, why the shard key choice is nearly irreversible, and what it costs (cross-shard joins/transactions).
- [ ] Explain why consistent hashing beats plain modulo for shard assignment during re-sharding.
