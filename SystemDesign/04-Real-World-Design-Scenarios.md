# Real-World Design Scenarios
## Design Twitter, Netflix, Uber - Complete Solutions

---

## TABLE OF CONTENTS
1. Design Twitter
2. Design Netflix
3. Design Uber
4. Interview Approach
5. Common Interview Questions

---

# PART 1: DESIGN TWITTER

## Requirements

```
FUNCTIONAL:
- Post tweets (140 characters)
- View timeline (home feed)
- Follow/unfollow users
- Like/retweet
- Search tweets
- User profiles

NON-FUNCTIONAL:
- 300M DAU
- 5k QPS average, 15k QPS peak
- Latency < 200ms (feed generation)
- 99.9% availability
- Read-heavy (95% reads, 5% writes)
```

---

## Capacity Estimation

```
USERS: 300M DAU
POSTS PER USER: 1 (average per day)
TOTAL POSTS: 300M posts/day

QPS CALCULATION:
Read: 300M * 100 posts read / 86400 = 347k QPS → round to 500k QPS
Write: 300M * 1 post / 86400 = 3.5k QPS → round to 5k QPS

STORAGE:
Per post: 
  - Tweet text: 280 bytes
  - Metadata: 100 bytes
  - Total: ~500 bytes
Posts per year: 365 * 300M = 109B posts
Storage needed: 109B * 500B = 54.5 TB (per year)

Retention: 5 years = 272 TB

BANDWIDTH:
500k QPS * 500 bytes = 250 MB/sec = 21 TB/day
```

---

## High-Level Architecture

```
ARCHITECTURE:

User → CDN → LB → Web Servers → Cache → Database
          └─────────────────────────────┘

COMPONENTS:

1. WEB SERVERS (Stateless)
   - Handle API requests
   - Validate input
   - Call service layer
   - 500k QPS needed → ~500 servers (1k QPS per server)

2. MESSAGE QUEUE (for async processing)
   - Send notifications
   - Update analytics
   - Generate feeds

3. CACHE (Redis)
   - Cache home feeds (hot data)
   - Cache user profiles
   - Cache trending topics

4. DATABASE (Primary + Replicas)
   - PostgreSQL for relational data
   - Users, tweets, relationships
   - Master: writes, Slaves: reads

5. SEARCH ENGINE (Elasticsearch)
   - Index tweets for search
   - Full-text search capability

6. BLOB STORAGE (S3)
   - Store images/videos
   - CDN integration

7. NOTIFICATION SERVICE
   - Send push notifications
   - Email notifications
```

---

## Detailed Design

### User & Tweet Storage

```
Database Schema:

users table:
├─ user_id (PK)
├─ username
├─ email
├─ bio
├─ created_at
└─ updated_at

tweets table:
├─ tweet_id (PK)
├─ user_id (FK)
├─ content (text)
├─ created_at
├─ like_count
├─ retweet_count
└─ INDEX(user_id, created_at)
└─ INDEX(created_at) for timeline

followers table:
├─ follower_id (FK)
├─ followee_id (FK)
└─ UNIQUE(follower_id, followee_id)

INDEX STRATEGY:
- tweets(user_id, created_at) for user's tweets
- tweets(created_at) for timeline
- followers(follower_id) for user's feed
```

---

### Timeline Generation (Most Complex)

```
PROBLEM: Generating home feed for millions of users

APPROACH 1: Pull Model (On-demand)
When user opens timeline:
  1. Get all following_ids
  2. Query tweets from all following users (expensive!)
  3. Sort by timestamp
  4. Return top 20

✅ Pros: Up-to-date
❌ Cons: Slow (join 1000 tables, 1 second+)

APPROACH 2: Push Model (Pre-compute)
When user posts:
  1. Get user's followers (e.g., 1M followers)
  2. Publish to each follower's feed queue
  3. Store in cache
  4. User's timeline ready instantly when opened

✅ Pros: Fast (< 100ms to read)
❌ Cons: Slow on write (fanout)
         Problem: Celebrity with 10M followers (too slow to fanout)

APPROACH 3: Hybrid (Pull + Push)
Normal users: Push to followers' cache (< 1M followers)
Celebrities: Use pull model (> 1M followers)

IMPLEMENTATION:
Cache: feed:user:123 → [tweet_id1, tweet_id2, ...]

When user posts:
  For each follower:
    1. Get timeline from cache
    2. Prepend new tweet
    3. Keep only 1000 recent tweets
    4. Update cache

When user opens timeline:
  1. Get feed:user:123 from cache (instant!)
  2. Fetch tweet details from database
  3. Return to user

SCALE:
- Push: 5k writes/sec * 200 followers avg = 1M cache updates/sec
- With caching, manageable
```

---

## Scaling Strategy

```
BOTTLENECK 1: Database writes (5k QPS)
Solution: Master database can handle (single PostgreSQL = 10k QPS)

BOTTLENECK 2: Database reads (500k QPS)
Solution: 
  - Cache home feeds (95% hit rate)
  - Read replicas for searches (3 slaves)
  - Result: 5k reads from DB (cached) + 50k reads from slaves

BOTTLENECK 3: Feed generation
Solution: Pre-compute feeds using push model
  - Use message queue for async processing
  - Distribute fanout across workers
  - Batch updates for efficiency

BOTTLENECK 4: Search (100k QPS)
Solution: Elasticsearch cluster
  - Shard by date (tweets from 2023 in shard 1, etc.)
  - Easy to delete old data (drop shard)

BOTTLENECK 5: Image/video storage
Solution: S3 + CloudFront CDN
  - Store blobs in S3
  - Serve via CDN (cached at edge)
```

---

# PART 2: DESIGN NETFLIX

## Requirements

```
FUNCTIONAL:
- Browse catalog
- Search for content
- Watch videos
- Recommendation system
- User profiles & settings
- Subscription & billing

NON-FUNCTIONAL:
- 200M users, 50M DAU
- 1M concurrent viewers at peak
- Video delivery < 1 second start time
- 99.99% availability
- Geographic distribution (global)
```

---

## High-Level Architecture

```
ARCHITECTURE:

User → Content Delivery Network (CDN) → Video segments
     → API Servers → Metadata DB
     → Recommendation Engine
     → Analytics

CONTENT DISTRIBUTION:

Original Content (US data center)
        ↓
Transcode to multiple quality levels:
├─ 480p (for mobile)
├─ 720p (for tablet)
├─ 1080p (for HD)
└─ 4K (for premium)

Store on:
├─ S3 (persistent storage)
├─ CDN Edge Locations (cached globally)
        ├─ Europe
        ├─ Asia
        ├─ Americas
        └─ Australia
```

---

## Video Streaming

```
ADAPTIVE BITRATE STREAMING (ABR):

Traditional: Stream entire movie in one quality
Problem: Video buffers if network slow

Netflix solution: HTTP Live Streaming (HLS)
  1. Video divided into 2-second chunks
  2. Available in multiple qualities (480p, 720p, 1080p)
  3. Client measures bandwidth
  4. Requests appropriate quality
  5. Seamless quality adjustment

DELIVERY:

Video chunk request:
  Client (user) → CDN
              → Check local cache
              → If not cached: Fetch from origin
              → Cache for future requests
              → Send to user

EXAMPLE:
User in San Francisco watches movie:
  1. Browser requests chunk 1 (480p)
  2. CDN in SF has it cached → 10ms delivery
  3. Network detected as fast
  4. Browser requests chunk 2 (1080p)
  5. CDN fetches from US origin → still fast
  6. User sees seamless HD experience

SCALE:
1M concurrent viewers * 2Mbps average = 2 million Mbps
= 2000 Gbps = 250 TB/sec

CDN handles this through:
- Edge caching (most popular 20% in each region)
- Multiple origin servers
- Sharding by geography
```

---

## Recommendation System

```
PROBLEM: 200M movies, need to recommend personalized

SOLUTION: Collaborative Filtering + Content-Based

APPROACH 1: COLLABORATIVE FILTERING
Find similar users → Recommend what they watched

User A watched: Avengers, Inception, Interstellar
User B watched: Avengers, Inception, Dune
→ Recommend Interstellar to B (A liked it, B similar to A)

Implementation: Matrix factorization
- User matrix: 50M users × 100 features
- Item matrix: 10k movies × 100 features
- Multiply: User vector × Movie vector = Score
- High score = recommend

APPROACH 2: CONTENT-BASED
Recommend similar movies

Movie A: Action, Sci-fi, Tom Cruise
Movie B: Action, Sci-fi, Ryan Gosling
→ Similar, recommend together

Implementation: Content features
- Genre, actors, director, language, release year
- Calculate similarity between movies
- Recommend high-similarity movies

HYBRID: Use both
- Collaborative: What similar users like
- Content: What similar movies are

TRAINING:
Train model weekly with:
  - User watch history
  - Rating/likes
  - Time watched
  - Completion rate

SERVING:
When user opens Netflix:
  1. Get user's embeddings
  2. Score all movies
  3. Combine with trending, new releases
  4. Return top 10 recommendations
  (All in < 100ms)

SCALE:
- Batch process: Train on all users (daily)
- Pre-compute recommendations (top 100 per user)
- Store in cache
- Serve from cache (fast)
```

---

# PART 3: DESIGN UBER

## Requirements

```
FUNCTIONAL:
- Request ride
- Match with driver
- Real-time tracking
- Payment
- Rating & reviews
- Pricing/surge pricing

NON-FUNCTIONAL:
- 100M users, 50M rides/day
- 40k QPS peak
- Real-time matching < 30 seconds
- 99.9% availability
- Geographically distributed
```

---

## High-Level Architecture

```
ARCHITECTURE:

User App → API Servers → Service Layer → Databases
Driver App → Location Service (Redis)
         → Matching Service
         → Payment Service
         → Analytics

KEY COMPONENTS:
1. Location Service (track drivers in real-time)
2. Matching Service (match riders with drivers)
3. Payment Service (process payments)
4. Notification Service (notify drivers, users)
5. Analytics (track metrics)
```

---

## Location & Matching

```
PROBLEM: Match 50M rider requests with 5M drivers instantly

LOCATION TRACKING:
Driver app sends location every 4 seconds:
  GPS → Driver app → Location Service
  
Location Service (Redis):
  Key: driver:driver_id:location
  Value: {latitude, longitude, timestamp}
  
  driver:1001:location = {40.7128, -74.0060, timestamp}
  driver:1002:location = {40.7580, -73.9855, timestamp}
  ...

SPATIAL INDEXING:
Problem: "Find drivers within 5km of rider location"
Solution: Geohash (convert lat/long to grid)

Geohash = divide map into cells
├─ Level 1: 8 cells (continents)
├─ Level 2: 64 cells
├─ Level 3: 512 cells
├─ Level 4: 4k cells (city-level)
└─ Level 5: 32k cells (neighborhood)

Redis Geospatial Commands:
  GEOADD drivers 40.7128 -74.0060 driver:1001
  GEORADIUS drivers 40.7128 -74.0060 5 km
  → Returns all drivers within 5km

MATCHING ALGORITHM:
When rider requests:
  1. Get rider location
  2. Find nearby drivers (within 5km)
  3. Rank by:
     - Distance (closer = higher)
     - Acceptance rate (reliable drivers)
     - Time to reach rider
     - Driver rating
  4. Send offer to top 3 drivers
  5. First to accept = matched

SCALE:
50M rides/day = 578 QPS matching requests
With parallelization: 40 QPS per server → need ~15 servers

Location updates:
5M drivers * 1 update per 4 sec = 1.25M updates/sec
Redis can handle (pipelining, sharding)
```

---

## Payment & Pricing

```
PAYMENT FLOW:
1. Ride complete
2. Calculate fare
3. Charge user's payment method
4. Send payment to driver
5. Keep commission

PRICING FORMULA:
Base fare + (Distance * per_km_rate) + (Time * per_min_rate) + Surge

SURGE PRICING:
Problem: High demand, few drivers → Wait time increases

Solution: Increase price to incentivize drivers
  Peak demand (evening rush): 2x
  Super peak (rain, bad weather): 3x

Algorithm:
  Current demand / Current supply = Multiplier
  1000 requests / 500 drivers = 2.0x multiplier
  Price = Base price * Multiplier

SCALE:
Payment processing: 578 QPS
Use third-party payment processor (Stripe, Square)
  - Handles PCI compliance
  - Process payments reliably
  - Instant transfer to driver account

Store transactions:
  Database: Ride ID → {user_id, driver_id, fare, payment_status}
  Ensure idempotency: If duplicate request, check DB before charging again
```

---

# PART 4: INTERVIEW APPROACH

## Step-by-Step Template

```
STEP 1: ASK CLARIFYING QUESTIONS (3-5 min)
├─ How many users?
├─ How many requests per second?
├─ Geographic distribution?
├─ What's most important (latency, availability, consistency)?
└─ Growth timeline?

STEP 2: ESTIMATE CAPACITY (5 min)
├─ Calculate DAU
├─ Calculate QPS (peak)
├─ Estimate storage
├─ Estimate bandwidth
└─ Estimate cache size

STEP 3: HIGH-LEVEL DESIGN (10 min)
├─ Draw system architecture (boxes & arrows)
├─ Main components
├─ Data flow
└─ Get interviewer feedback

STEP 4: DETAILED DESIGN (15 min)
Choose most important component:
├─ Database schema
├─ Key algorithms (matching, ranking)
├─ Caching strategy
├─ API design
└─ Trade-off decisions

STEP 5: BOTTLENECKS & OPTIMIZATION (5 min)
├─ Identify single points of failure
├─ Propose solutions
├─ Discuss trade-offs
└─ Answer "what if" questions

COMMUNICATION:
- Speak out loud continuously
- "I think the bottleneck is..."
- "To solve this, I would..."
- Ask for feedback: "Does this make sense?"
- Correct yourself: "Actually, that won't scale because..."
```

---

# PART 5: COMMON PATTERNS

## Patterns to Know

```
PATTERN 1: Cache-Aside
- Check cache first
- If miss: fetch from database
- Update cache
- Return to user

PATTERN 2: Pre-computation
- Compute results offline
- Store in cache/database
- Serve instantly on request

PATTERN 3: Message Queue
- Async processing
- Decouple components
- Eventual consistency

PATTERN 4: Replication
- Primary + replicas
- Read from replicas (scale reads)
- Writes to primary (consistency)

PATTERN 5: Sharding
- Partition data by key
- Distribute across databases
- Linear scaling

PATTERN 6: Circuit Breaker
- Detect failures fast
- Fast-fail instead of retry
- Recover gracefully

PATTERN 7: Load Balancing
- Distribute traffic
- Round-robin / least connections
- Health checks

PATTERN 8: CDN
- Cache static content at edge
- Reduce latency
- Reduce bandwidth
```

---

# SUMMARY: Real-World Design

✅ **Design Twitter:**
- [ ] Can explain timeline generation (push vs pull)
- [ ] Know feed caching strategy
- [ ] Know capacity estimation
- [ ] Understand search indexing

✅ **Design Netflix:**
- [ ] Know video streaming (HLS, ABR)
- [ ] Understand CDN caching
- [ ] Know recommendation (collaborative filtering)
- [ ] Understand geographic distribution

✅ **Design Uber:**
- [ ] Know real-time location tracking
- [ ] Know geospatial indexing
- [ ] Understand matching algorithm
- [ ] Know surge pricing

✅ **Interview Skills:**
- [ ] Can follow structured approach
- [ ] Can estimate capacity
- [ ] Can design architecture
- [ ] Can discuss trade-offs

---

**Master real-world scenarios—they're 40% of system design interviews!**
