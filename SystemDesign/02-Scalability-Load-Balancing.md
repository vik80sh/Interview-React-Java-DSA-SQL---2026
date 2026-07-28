# Scalability & Load Balancing
## Load Balancers, CDN, Horizontal Scaling, High Availability

---

## TABLE OF CONTENTS
1. Load Balancing Fundamentals
2. Load Balancing Algorithms
3. Content Delivery Networks (CDN)
4. Database Replication & Sharding
5. High Availability & Redundancy
6. Common Interview Questions

---

# PART 1: LOAD BALANCING FUNDAMENTALS

## What is Load Balancing?

```
Load Balancing = Distributing traffic across multiple servers

PROBLEM: Single server can't handle all traffic
Solution: Multiple servers + load balancer to distribute load

ARCHITECTURE:
             User Requests
                  ↓
            Load Balancer (Layer 4/7)
                  ↓
        ┌─────────┼─────────┐
        ↓         ↓         ↓
     Server 1  Server 2  Server 3
        ↓         ↓         ↓
            Shared Database

BENEFITS:
- Distributes load evenly
- Prevents single server from overloading
- Enable horizontal scaling
- Improves availability (failover)
- Better resource utilization
```

---

## Types of Load Balancers

```
LAYER 4 (Transport Layer) - L4LB:
├─ Works with IP + TCP/UDP
├─ Very fast (simple)
├─ Examples: AWS Network Load Balancer (NLB)
└─ Use for: Gaming, extreme scale (1M+ QPS)

LAYER 7 (Application Layer) - L7LB:
├─ Works with HTTP/HTTPS
├─ Can route based on URL, hostname, headers
├─ Examples: AWS Application Load Balancer (ALB), Nginx
└─ Use for: Most web applications

HARDWARE LOAD BALANCER:
├─ Expensive, very fast
├─ Examples: F5, Citrix NetScaler
└─ Use for: Enterprise, extreme scale

SOFTWARE LOAD BALANCER:
├─ Cheap, flexible, open-source
├─ Examples: Nginx, HAProxy, Traefik
└─ Use for: Most systems

CLOUD LOAD BALANCER:
├─ Managed, auto-scaling
├─ Examples: AWS ELB, Google LB, Azure LB
└─ Use for: Cloud deployments
```

---

## Load Balancing Algorithms

```
ROUND ROBIN (Simple, default):
Request 1 → Server 1
Request 2 → Server 2
Request 3 → Server 3
Request 4 → Server 1
...
✅ Fair distribution
❌ Doesn't account for server capacity

WEIGHTED ROUND ROBIN:
Server 1 (weight 3) → 3 requests
Server 2 (weight 2) → 2 requests
Server 3 (weight 1) → 1 request

✅ Can assign different capacity
❌ Still static weights

LEAST CONNECTIONS:
Routes to server with fewest active connections
✅ Good for long-lived connections
❌ Doesn't account for load per connection

LEAST RESPONSE TIME:
Routes to server with fastest response time
✅ Adapts to current server load
❌ Requires monitoring

IP HASH (Sticky sessions):
Hash of client IP determines server
Request 1 (IP 1.1.1.1) → Server 1
Request 2 (IP 1.1.1.1) → Server 1 (same!)

✅ All requests from same client go to same server
✅ Good for session-based systems
❌ Uneven distribution if many users from same IP

RANDOM:
Random server selection
✅ Simple
❌ Uneven distribution

BEST PRACTICE:
- Use least connections or response time
- Enable health checks
- Consider sticky sessions for stateful apps
```

---

## Sticky Sessions Problem

```
PROBLEM: User state is in-memory on server

Request 1 → Server A (login, store session in memory)
Request 2 → Server B (no session! User logged out)

SOLUTIONS:

1. STICKY SESSIONS (IP-based routing)
   All requests from same IP → Same server
   ✅ Works
   ❌ Bad load distribution
   ❌ Session lost if server fails

2. STORE SESSION IN DATABASE
   All servers share same session store
   ✅ Load balancing works
   ✅ Session survives server failure
   ❌ Database becomes bottleneck
   
   Database:
   Session ID → User data
   abc123 → {user: john, role: admin}

3. JWT TOKENS
   Client stores token, sends with each request
   ✅ Stateless (best!)
   ✅ Easy to scale
   ✅ Works with CDN
   ❌ Token validation cost
   
   Flow:
   Request 1 → Server A (validate JWT)
   Request 2 → Server B (validate JWT, no lookup needed!)

BEST PRACTICE: Use JWT tokens (stateless)
```

---

# PART 2: CONTENT DELIVERY NETWORKS (CDN)

## What is a CDN?

```
CDN = Content Delivery Network (geographic distribution)

PROBLEM: Users far from server have high latency

SOLUTION: Cache content at edge locations near users

ARCHITECTURE:
┌─────────────────────────────────────┐
│         Origin Server (US)          │
│      Stores authoritative copy      │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
    ┌─────────┐      ┌─────────┐
    │ Edge 1  │      │ Edge 2  │
    │(Europe) │      │(Asia)   │
    └────┬────┘      └────┬────┘
         │                 │
    ┌────────────┐    ┌────────────┐
    │ User (EU)  │    │ User (SG)  │
    └────────────┘    └────────────┘

BENEFITS:
- Lower latency (closer server)
- Reduce bandwidth costs
- Improve availability
- DDoS protection
- SSL offloading
```

---

## CDN How It Works

```
REQUEST FLOW:

1. USER REQUESTS: GET /image.jpg
   └─ Browser resolves CDN domain → nearest edge location

2. CDN EDGE CHECK:
   ├─ Cache hit? Return from edge (fast!)
   └─ Cache miss? Fetch from origin

3. FETCH FROM ORIGIN:
   Edge fetches from origin server
   └─ Origin: /image.jpg → response

4. CACHE & RETURN:
   Edge caches for future requests
   └─ Return to user

5. NEXT USER (same region):
   └─ Gets from cache (no origin fetch!)

CACHE CONTROL:
HTTP Headers control CDN caching:
- Cache-Control: public, max-age=3600 (cache 1 hour)
- Cache-Control: private (don't cache)
- ETag: Validate if stale
- If-Modified-Since: Check if changed

EXAMPLE: Netflix
├─ Origin: Master copy in US
├─ Edge: Paris, Tokyo, Sydney, etc.
├─ User in France: Fetch from Paris edge
└─ < 10ms latency (instead of 150ms from US)
```

---

## When to Use CDN

```
✅ USE CDN FOR:
- Static files (images, CSS, JS, fonts)
- Videos (huge bandwidth saver)
- Downloads
- HTML (if cacheable)
- API responses (if can be cached)

❌ DON'T USE CDN FOR:
- Dynamic HTML (varies per user)
- Authentication-required content
- Real-time data
- Very frequently changing data

CACHING STRATEGY:
1. Cache static files forever (versioned filenames)
   - style.abc123.css (hash in filename)
   - Browser never requests again

2. Cache HTML short duration (1 minute)
   - Check if changed frequently

3. Cache API responses
   - Only if data doesn't change frequently
   - Use proper Cache-Control headers

POPULAR CDNs:
- Cloudflare (cheapest, good DDoS)
- AWS CloudFront (best if on AWS)
- Akamai (most expensive, best performance)
- Fastly (good for dynamic content)
```

---

# PART 3: DATABASE REPLICATION & SHARDING

## Database Replication

```
REPLICATION = Copy data to multiple database servers

ARCHITECTURE:
            Application Servers
                    ↓
             ┌──────┴──────┐
             ↓             ↓
          Master       Master
         (Primary)   (Backup)
          Read/Write   Read-only
             ↓             ↓
        Replicate      Replicate
             ↓             ↓
         Slave 1       Slave 2
       (Read-only)   (Read-only)

BENEFITS:
- Scalability (reads to slaves)
- High availability (failover)
- Backup (in case of data loss)

TRADE-OFFS:
- Replication lag (data inconsistency)
- Writes still go to master (bottleneck)
- Complex failover

LIMITATIONS:
- Master is still bottleneck for writes
- Can't exceed single master write capacity (~10k QPS)
```

---

## Database Sharding

```
SHARDING = Split data across multiple databases

PROBLEM: Single database can't handle massive load
SOLUTION: Partition data and spread across shards

ARCHITECTURE:
Application
    ↓
┌───┴───┬───────┬───────┐
↓       ↓       ↓       ↓
User 1-1M | Shard 1 (MySQL)
User 1M-2M | Shard 2 (MySQL)
User 2M-3M | Shard 3 (MySQL)
User 3M-4M | Shard 4 (MySQL)

SHARDING KEY STRATEGIES:

1. RANGE-BASED (Simple, uneven)
   Users 1-1M → Shard 1
   Users 1M-2M → Shard 2
   ❌ Hotspot problem (some ranges have more data)

2. HASH-BASED (Even distribution)
   hash(user_id) % 4 = shard_number
   ✅ Even distribution
   ❌ Can't easily reshard (hash changes)

3. DIRECTORY-BASED (Most flexible)
   Lookup service: user_id → shard_id
   ✅ Flexible, can reshard
   ❌ Lookup service bottleneck

BENEFITS:
- Linear scaling (4 shards = 4x capacity)
- Each shard independent
- Can fail independently

TRADE-OFFS:
- Complex joins (data in different shards)
- Transactions across shards hard
- Difficult to reshard (rebalance)
- Hotspot problem (uneven distribution)

EXAMPLE: Twitter
├─ Shard by user_id
├─ User 1-100M → Shard 1
├─ User 100M-200M → Shard 2
└─ Each shard = separate MySQL server
```

---

# PART 4: HIGH AVAILABILITY & REDUNDANCY

## Redundancy Strategies

```
REDUNDANCY = Multiple copies to survive failures

SINGLE POINT OF FAILURE (Bad):
  Client → Load Balancer → Server
  
  Problem: If LB fails, system down!

REDUNDANT LOAD BALANCER (Better):
  Client → LB1 (Primary)
           LB2 (Standby - takes over if LB1 fails)
           
  Problem: How does client know LB1 failed?

SOLUTION: Use DNS + Health Checks
           
  Client → DNS (returns multiple IPs)
           ├─ LB1 IP (primary)
           └─ LB2 IP (backup)
           
  If LB1 fails:
  ├─ Health check fails
  ├─ DNS stops returning LB1 IP
  └─ Clients get LB2 IP

FULL REDUNDANCY:
         User Requests
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
   LB1 (DC1)          LB2 (DC2)
    ↓                   ↓
┌───────────┐       ┌───────────┐
│ Server1   │       │ Server2   │
│ Server2   │       │ Server2   │
│ Server3   │       │ Server3   │
└────┬──────┘       └────┬──────┘
     │ Master            │ Master
     │                   │
    Replicate ←→ Replicate
     │                   │
   Slaves              Slaves

FAILOVER METHODS:

1. ACTIVE-PASSIVE (Standby)
   ├─ Primary handles all traffic
   ├─ Standby waits idle
   ├─ If primary fails, failover to standby
   └─ Trade-off: Wasted resources

2. ACTIVE-ACTIVE
   ├─ Both handle traffic
   ├─ If one fails, other handles all
   └─ More efficient

3. MULTI-REGION
   ├─ Multiple data centers
   ├─ If one region fails, users get other region
   └─ Highest availability
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: Design load balancing for high-traffic system

**Answer:**
```
REQUIREMENTS:
- 1 million QPS peak
- Low latency < 100ms
- 99.99% availability

DESIGN:

1. LOAD BALANCER LAYER:
   - AWS ALB (Application LB) for HTTP/HTTPS routing
   - Multiple LBs in different AZs (active-active)
   - Health checks every 5 seconds
   - Round-robin with least connections algorithm

2. APPLICATION SERVERS:
   - Stateless (use JWT tokens)
   - Auto-scaling group
   - 1000 QPS per server → need 1000 servers
   - Distributed across 3 AZs (3 per AZ)

3. CACHING LAYER:
   - Redis cluster for session/data cache
   - Reduces DB load
   - Multi-region replication

4. DATABASE:
   - Master-slave replication
   - Reads to slaves
   - Master for writes
   - Sharding if write-heavy

5. CDN:
   - Cloudflare for static assets
   - Cache images, JS, CSS, etc.

SCALING STRATEGY:
- Add servers (horizontal)
- Use auto-scaling based on CPU
- Monitor and adjust
```

---

## Question 2: What happens when single database becomes bottleneck?

**Answer:**
```
SYMPTOMS:
- Slow queries
- High CPU on database
- High memory usage
- Connections maxed out

SOLUTIONS (in order):

1. OPTIMIZE QUERIES
   - Add indexes
   - Reduce full table scans
   - Optimize JOINs
   Benefit: 2-5x improvement

2. ADD CACHING
   - Redis for frequently accessed data
   - Reduces database hits
   Benefit: 10x improvement

3. DATABASE REPLICATION
   - Read from slaves
   - Master handles writes
   Benefit: 5x improvement (3 slaves = 5x read capacity)

4. DATABASE SHARDING
   - Partition data
   - Distribute across multiple databases
   Benefit: Linear scaling (4 shards = 4x capacity)
   Cost: Complex, hard to reshard

5. SWITCH TO WRITE-OPTIMIZED DB
   - Use NoSQL (Cassandra, HBase)
   - Designed for high write throughput
   Benefit: Can handle much higher load

TYPICAL PROGRESSION:
- Single DB + cache → handles 100k QPS
- Replication + cache → handles 500k QPS
- Sharding + cache → handles millions QPS
```

---

## Question 3: How to reduce latency for global users?

**Answer:**
```
SOLUTIONS:

1. CDN FOR STATIC ASSETS (Best ROI)
   - Cache images, CSS, JS globally
   - Users get content from nearest edge
   - Reduces by 100-200ms for far users

2. DATABASE REPLICAS IN MULTIPLE REGIONS
   - Read from nearest replica
   - Reduces network round-trip time
   - Trade-off: Eventually consistent

3. REDUCE RESPONSE SIZE
   - Compress responses (gzip)
   - Minify CSS/JS
   - Reduce payload

4. OPTIMIZE BACKEND
   - Cache frequently accessed data
   - Use efficient algorithms
   - Reduce unnecessary processing

5. MULTI-REGION DEPLOYMENT
   - Deploy application in multiple regions
   - Route users to nearest region
   - If region fails, route to next

EXAMPLE: Netflix
├─ CDN for video (Akamai)
├─ Replicas in every major country
├─ Fast, local database reads
└─ Result: < 50ms latency globally
```

---

# SUMMARY: Scalability & Load Balancing

✅ **Load Balancing:**
- [ ] Know types (L4 vs L7)
- [ ] Know algorithms (round-robin, least connections)
- [ ] Understand sticky sessions
- [ ] Know health checks

✅ **CDN:**
- [ ] Understand how CDN works
- [ ] Know when to use
- [ ] Know cache headers
- [ ] Understand edge locations

✅ **Database Scaling:**
- [ ] Know replication (read scaling)
- [ ] Know sharding (write scaling)
- [ ] Understand trade-offs
- [ ] Know limitations

✅ **High Availability:**
- [ ] Know redundancy strategies
- [ ] Know failover methods
- [ ] Understand multi-region
- [ ] Know RTO/RPO

---

**Master load balancing & scalability—they're critical for scale!**
