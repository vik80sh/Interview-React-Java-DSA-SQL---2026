# System Design Fundamentals
## Core Concepts, Trade-offs, CAP Theorem, ACID vs BASE

---

## TABLE OF CONTENTS
1. System Design Overview
2. CAP Theorem & Consistency Models
3. ACID vs BASE
4. Vertical vs Horizontal Scaling
5. Design Principles & Trade-offs
6. Common Interview Questions

---

# PART 1: SYSTEM DESIGN OVERVIEW

## What is System Design?

```
System Design = Designing architecture of large-scale systems

Focuses on:
- How to handle millions of users
- How to scale to billions of requests
- How to maintain reliability & performance
- How to design for failure

Key Metrics:
- Latency (response time)
- Throughput (requests/sec)
- Availability (uptime %)
- Scalability (handle growth)
- Consistency (data correctness)
```

---

## Interview Structure (45-60 minutes)

```
STEP 1: REQUIREMENTS (5-10 min)
├─ Functional: What system should do
├─ Non-functional: Performance, scale, availability
└─ Ask clarifying questions!

STEP 2: ESTIMATION (5-10 min)
├─ Users per day
├─ Requests per second (QPS)
├─ Data storage needed
└─ Bandwidth requirements

STEP 3: HIGH-LEVEL DESIGN (10-15 min)
├─ Architecture diagram
├─ Main components
└─ Data flow

STEP 4: DEEP DIVE (15-20 min)
├─ Specific components
├─ Trade-offs & decisions
└─ Bottlenecks & solutions

STEP 5: BOTTLENECKS & OPTIMIZATION (5-10 min)
├─ Identify issues
├─ Propose solutions
└─ Discuss trade-offs

KEY RULE: Think out loud! Interviewer wants to see your thought process.
```

---

## Estimation Formulas

```
DAILY ACTIVE USERS (DAU): Total users * activity rate
Example: 1 million users * 10% = 100k DAU

QUERIES PER SECOND (QPS): DAU * queries per user per day / 86400
Example: 100k * 100 queries / 86400 ≈ 115 QPS

DATABASE SIZE: DAU * data per user * days retained
Example: 100k * 1KB * 365 = 36.5 GB

BANDWIDTH: QPS * avg request/response size
Example: 115 QPS * 5KB = 575 KB/sec ≈ 43 GB/day

CACHE SIZE: Frequently accessed data (80/20 rule)
Example: Total data * 20% = 7.3 GB

Common Estimates:
- Twitter: 300M DAU, 5k QPS at peak
- Facebook: 2B DAU, 50k QPS at peak
- Netflix: 200M users, 1M QPS at peak (reads)
```

---

# PART 2: CAP THEOREM

## The CAP Theorem

```
CAP = Consistency, Availability, Partition tolerance

Definition:
- Consistency: All nodes see same data at same time
- Availability: System always responds
- Partition tolerance: System works when network partitions occur

THE RULE: In case of network partition, choose CP or AP
(You CAN'T have all three in distributed system)

                    CAP TRIANGLE
                    /         \
                   /           \
                  C ─────────── A
                   \           /
                    \         /
                      P ───────

When network partition happens (P is always possible):
- CP (Consistency + Partition): Refuse some requests (like PostgreSQL with strong consistency)
- AP (Availability + Partition): Accept all requests, data might be stale (like DynamoDB)
```

---

## Consistency Models

```
STRONG CONSISTENCY (CP):
├─ All reads see latest write
├─ Good for: Banking, critical data
└─ Trade-off: Slower, less available
Example: PostgreSQL with synchronous replication

EVENTUAL CONSISTENCY (AP):
├─ Reads might see stale data
├─ Eventually all nodes converge
├─ Good for: Social media, caching
└─ Trade-off: Complex conflict resolution
Example: DynamoDB, Cassandra

CAUSAL CONSISTENCY:
├─ Related operations maintain order
├─ Unrelated operations can be concurrent
└─ Middle ground between strong & eventual
Example: Google Cloud Datastore

MONOTONIC READ CONSISTENCY:
├─ Once you read value, future reads won't see older values
└─ Good for: User sessions
Example: Redis with same replica

READ-YOUR-WRITE:
├─ Writes immediately visible to same user
└─ Good for: User experience
Example: Master-slave with special handling for same user
```

---

# PART 3: ACID VS BASE

## ACID (Traditional Databases)

```
ACID = Atomicity, Consistency, Isolation, Durability

Atomicity: Transaction all-or-nothing
├─ All operations succeed or all fail
└─ No partial updates
Example: Transfer money - debit & credit both happen or neither

Consistency: Data integrity
├─ Database moves from valid state to valid state
├─ Constraints always satisfied
└─ Example: Foreign key constraints

Isolation: Concurrent transactions don't interfere
├─ Transaction sees consistent snapshot
├─ Prevents dirty reads, phantom reads
└─ Different isolation levels (READ_UNCOMMITTED to SERIALIZABLE)

Durability: Once committed, stays committed
├─ Data survives hardware failures
├─ Write to disk before returning success
└─ Can tolerate power loss

DATABASES: PostgreSQL, MySQL, Oracle, SQL Server
GOOD FOR: Financial systems, critical data
TRADE-OFF: Slower, harder to scale horizontally
```

---

## BASE (NoSQL Databases)

```
BASE = Basically Available, Soft state, Eventually consistent

Basically Available:
├─ System always available
├─ Might return stale data
└─ Trade-off: Weak consistency

Soft State:
├─ State might change without user input
├─ Data replicating between nodes
└─ Temporary inconsistency allowed

Eventually Consistent:
├─ All replicas converge eventually
├─ Might take seconds/minutes
└─ Acceptable for non-critical data

DATABASES: DynamoDB, MongoDB, Cassandra, Redis
GOOD FOR: High-scale systems, high availability needed
TRADE-OFF: Complex application logic, eventual consistency
```

---

## ACID vs BASE Comparison

```
                ACID              BASE
─────────────────────────────────────────
Consistency     Strong            Eventual
Availability    Lower             Higher
Scalability     Vertical          Horizontal
Transactions    Full support      Limited
Speed           Slower            Faster
Use case        Banking           Social media

WHEN TO USE ACID:
- Financial transactions
- Medical records
- Legal documents
- Critical business data

WHEN TO USE BASE:
- Social media feeds
- User timelines
- Analytics
- Caching layers
- High-traffic APIs
```

---

# PART 4: VERTICAL VS HORIZONTAL SCALING

## Vertical Scaling (Scale Up)

```
Adding more power to single machine

EXAMPLE:
Server 1: 4 cores, 8GB RAM → 8 cores, 32GB RAM

PROS:
- Simpler (no coordination needed)
- Works for monoliths
- Lower latency

CONS:
- Expensive (more cores = exponentially higher cost)
- Limited (can't add cores infinitely)
- Single point of failure
- Must restart server

GOOD FOR:
- Databases
- Cache servers
- When load < single machine capacity

TYPICAL LIMITS:
- CPU: 64+ cores enough for most systems
- RAM: 512 GB sufficient
- Cost: AWS m5.4xlarge ≈ $1000/month

EXAMPLE: When to scale up:
1 server, 100% CPU utilization
→ Add more cores
→ Now 50% utilization
→ Can handle 2x traffic
```

---

## Horizontal Scaling (Scale Out)

```
Adding more machines (servers)

EXAMPLE:
1 server handling 1000 QPS → 10 servers handling 100 QPS each

PROS:
- Cheap (buy many cheap machines)
- Unlimited scalability
- No single point of failure
- Can scale dynamically
- Load distribution

CONS:
- Complex (coordination, consistency, networking)
- Higher latency (multiple hops)
- Database bottleneck
- Operational complexity

GOOD FOR:
- Web servers
- API servers
- When traffic >> single machine

CHALLENGES:
1. Load balancing (distribute traffic)
2. Session management (sticky sessions)
3. Database sync
4. Cache coherency

TYPICAL PATTERN:
Load Balancer
├─ Server 1
├─ Server 2
├─ Server 3
└─ Database (bottleneck!)
```

---

## Hybrid Approach (Recommended)

```
Use BOTH vertical AND horizontal scaling

EXAMPLE: Twitter-like system
Scale web servers: Horizontally (easy to add)
Scale database: Vertically (first), then sharding (hard)
Scale cache: Horizontally (Redis cluster)

COST-BENEFIT:
- Vertical scaling: Faster, easier, until ~8-16 cores
- Horizontal scaling: Slower, harder, but unlimited

STRATEGY:
1. Start with single server (vertical)
2. At capacity, add load balancer + 2 servers (horizontal)
3. At capacity, vertical scale database
4. At capacity, shard database (horizontal)
5. At capacity, add cache layer
6. Continue horizontally for web/cache layers
```

---

# PART 5: DESIGN PRINCIPLES & TRADE-OFFS

## Latency vs Throughput

```
LATENCY = Time for single request to complete
THROUGHPUT = Number of requests completed per second

Example 1: 100ms latency, 10 QPS throughput
├─ Slow response time
└─ Can't handle much traffic

Example 2: 10ms latency, 100 QPS throughput
├─ Fast response
└─ Can handle more traffic

Usually: Add parallelism increases throughput but not latency
├─ 1 server: 10ms latency, 100 QPS
├─ 10 servers: 10ms latency, 1000 QPS (better throughput)
├─ But still 10ms per request (same latency)

In interviews: Mention both!
"This design prioritizes throughput over latency"
```

---

## Consistency vs Availability vs Latency

```
TRADE-OFF TRIANGLE:

                 High Consistency
                        /\
                       /  \
                      /    \
                     /      \
                    /        \
                   /          \
       Low Latency /            \ Low Availability
                  /              \
                 /________________\
           Availability      Consistency

Can't optimize all three!

EXAMPLES:

High Consistency + Low Latency = Low Availability
├─ Synchronous replication
├─ Strong transactions
└─ Trade-off: If master fails, system unavailable
Database: PostgreSQL with sync replication

Low Consistency + Low Latency = High Availability
├─ Eventual consistency
├─ Async replication
└─ Trade-off: Might see stale data
Database: DynamoDB

Low Latency + High Availability = Weak Consistency
├─ Cache heavily
├─ Accept stale data
└─ Trade-off: Data might be inconsistent
Example: Caching layer (Redis)

CHOOSE BASED ON USE CASE:
- Banking: Consistency > Availability
- Social media: Availability > Consistency
- Search: Low latency > Consistency
```

---

## Data Consistency vs Scalability

```
PROBLEM: As you scale, consistency becomes harder

SCENARIOS:

1. SINGLE DATABASE (Consistent but not scalable)
   Client → Load Balancer → Many Servers → Single Database
   
   Problem: Database is bottleneck
   Example: All users write to one PostgreSQL
   Limit: ~10k QPS

2. REPLICATED DATABASE (More scalable, consistency hard)
   Client → LB → Servers
                    ├─ Master (writes)
                    ├─ Slave 1 (reads)
                    └─ Slave 2 (reads)
   
   Issue: Replication lag (eventual consistency)
   Example: 1 master, 3 slaves
   Benefit: ~30k QPS (write limited by master)

3. SHARDED DATABASE (Maximum scalability, consistency complex)
   Client → LB → Servers
                    ├─ Shard 1 (User 1-1M)
                    ├─ Shard 2 (User 1M-2M)
                    └─ Shard 3 (User 2M-3M)
   
   Benefit: Linear scaling (3 shards = 3x capacity)
   Trade-off: Complex joins, transactions

RULE: As you scale, you trade consistency for performance
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: Explain CAP Theorem

**Answer:**
```
CAP theorem states you can pick 2 out of 3 in distributed system:

1. Consistency - All nodes see same data
2. Availability - System always available
3. Partition tolerance - Survives network partitions

In practice, network partition (P) always possible, so:
- CP (strong consistency): PostgreSQL, traditional databases
- AP (high availability): NoSQL like DynamoDB, Cassandra

Choice depends on application:
- Banking: Need CP (strong consistency)
- Social media: Need AP (high availability)
```

---

## Question 2: When to use SQL vs NoSQL?

**Answer:**
```
USE SQL WHEN:
- Structured data with schema
- Need ACID transactions
- Complex queries with JOINs
- Relationships between data (banking, inventory)
- Low to medium scale

Examples: PostgreSQL, MySQL, Oracle

USE NoSQL WHEN:
- Unstructured/semi-structured data
- Massive scale (>1M QPS)
- High availability needed
- Simple access patterns
- Fast reads/writes
- Data consistency not critical

Examples: MongoDB (document), DynamoDB (key-value), 
          Cassandra (wide column), Redis (cache)

HYBRID: Use both!
- SQL for relational data (users, orders)
- NoSQL for high-volume data (logs, events, cache)
```

---

## Question 3: How to estimate system capacity?

**Answer:**
```
1. CALCULATE DAU (Daily Active Users)
   Total users × activity rate
   Example: 100M users × 1% = 1M DAU

2. CALCULATE QPS (Queries Per Second)
   DAU × operations per user per day / 86400
   Example: 1M × 100 / 86400 ≈ 1157 QPS

3. PEAK QPS
   Usually 2-3x average during peak hours
   Example: 1157 × 3 = 3471 QPS at peak

4. STORAGE NEEDED
   DAU × data per user × retention days
   Example: 1M × 1KB × 365 = 365 GB

5. BANDWIDTH
   Peak QPS × avg request size
   Example: 3471 × 5KB = 17 MB/sec

THEN: Design to handle peak QPS with 2x buffer
      3471 × 2 = 7000 QPS capacity needed
```

---

## Question 4: Vertical vs Horizontal scaling - Which to use?

**Answer:**
```
VERTICAL SCALING (Add power to single machine):
- Simpler, cheaper initially
- Use first: 1-8 cores, up to 32GB RAM
- Limit: Can't add infinitely (expensive)
- Single point of failure

HORIZONTAL SCALING (Add more machines):
- Complex (need load balancer, coordination)
- Use when single machine at capacity
- Can scale infinitely
- Better availability

STRATEGY:
1. Start with 1 server
2. Vertical scale to 8 cores, 32GB RAM
3. Add load balancer + 2-3 more servers
4. Horizontal scale web/API servers easily
5. For database: Vertical first, then sharding (hard)
6. For cache: Horizontal (Redis cluster)

RULE: Vertical until expensive, then horizontal
```

---

## Question 5: Design trade-offs - What's most important?

**Answer:**
```
CONSISTENCY vs AVAILABILITY vs LATENCY

BANKING SYSTEM:
Priority: Consistency >> Availability > Latency
Why: Money can't disappear or duplicate
Trade-off: If system down, okay. But data must be consistent.

SOCIAL MEDIA (Twitter):
Priority: Availability > Latency > Consistency
Why: Users want always-on system, eventual consistency okay
Trade-off: Tweet might take few seconds to appear for all users

E-COMMERCE:
Priority: Consistency > Availability ≥ Latency
Why: Inventory must be accurate, avoid overselling
Trade-off: Might show "out of stock" temporarily to ensure consistency

SEARCH ENGINE:
Priority: Latency > Availability > Consistency
Why: Users expect fast results, can tolerate stale data
Trade-off: Search results might be 1 hour old, that's okay

KEY: Understand trade-offs and prioritize based on use case!
```

---

# SUMMARY: System Design Fundamentals

✅ **Core Concepts:**
- [ ] Understand CAP theorem
- [ ] Know CP vs AP systems
- [ ] Know ACID vs BASE
- [ ] Understand consistency models

✅ **Scaling:**
- [ ] Difference between vertical & horizontal
- [ ] When to use each
- [ ] Capacity estimation

✅ **Trade-offs:**
- [ ] Consistency vs Availability vs Latency
- [ ] Data consistency vs scalability
- [ ] SQL vs NoSQL

✅ **Interview Skills:**
- [ ] Can estimate system requirements
- [ ] Can think about trade-offs
- [ ] Can explain design decisions
- [ ] Can think out loud

---

**Master fundamentals—they apply to EVERY system design!**
