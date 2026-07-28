# Database Design
## SQL vs NoSQL, Schema Design, Indexing, Read/Write Patterns

---

## TABLE OF CONTENTS
1. SQL vs NoSQL Decision
2. SQL Database Design
3. NoSQL Database Types
4. Indexing & Query Optimization
5. Read/Write Patterns
6. Common Interview Questions

---

# PART 1: SQL VS NOSQL DECISION

## SQL Databases

```
SQL = Structured Query Language (Relational)

Examples: PostgreSQL, MySQL, Oracle, SQL Server

CHARACTERISTICS:
├─ Schema (predefined structure)
├─ ACID transactions
├─ Complex queries with JOINs
├─ Normalized data (reduce duplication)
└─ Vertical scaling

SCHEMA EXAMPLE:
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT FOREIGN KEY,
  amount DECIMAL(10,2),
  created_at TIMESTAMP
);

QUERY:
SELECT u.name, COUNT(*) as order_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

STRENGTHS:
✅ Strong consistency
✅ Complex queries easy
✅ Data integrity (constraints)
✅ Mature, well-understood
✅ SQL standard across databases

WEAKNESSES:
❌ Hard to scale horizontally
❌ Slower with massive datasets
❌ Schema changes complicated
❌ Not good for semi-structured data
```

---

## NoSQL Databases

```
DOCUMENT STORE (MongoDB):
{
  "_id": 1,
  "name": "John",
  "email": "john@example.com",
  "orders": [
    { "id": 1, "amount": 100 },
    { "id": 2, "amount": 200 }
  ]
}

STRENGTHS: Flexible schema, good for unstructured data
WEAKNESSES: No JOIN, eventual consistency

KEY-VALUE STORE (Redis, Memcached):
Key: user:123
Value: {name: John, email: john@example.com}

STRENGTHS: Ultra-fast, simple access patterns
WEAKNESSES: No queries, limited data types

WIDE COLUMN (Cassandra, HBase):
Row Key | Column 1 | Column 2 | Column 3
user:1  | name     | email    | created
        | John     | j@ex.com | 2023-01-01

STRENGTHS: Scales horizontally, high write throughput
WEAKNESSES: Complex to query, eventual consistency

SEARCH ENGINE (Elasticsearch):
{
  "name": "John",
  "email": "john@example.com",
  "bio": "Software engineer..."
}
Query: Full-text search

STRENGTHS: Fast searching, flexible
WEAKNESSES: Not transactional, memory-intensive
```

---

## Decision Tree

```
QUESTION 1: Complex relationships? Multiple entities?
└─ YES → SQL (PostgreSQL, MySQL)
└─ NO → Continue

QUESTION 2: Need ACID transactions across multiple entities?
└─ YES → SQL
└─ NO → Continue

QUESTION 3: Massive scale (>1M QPS)?
└─ YES → NoSQL
└─ NO → Continue

QUESTION 4: Unstructured/semi-structured data?
└─ YES → Document store (MongoDB)
└─ NO → Continue

QUESTION 5: Need full-text search?
└─ YES → Elasticsearch
└─ NO → Continue

QUESTION 6: Key-value access pattern only?
└─ YES → Redis/Memcached
└─ NO → SQL (probably)

DECISION MATRIX:
Use Case              Type        Database
─────────────────────────────────────────
User profiles         SQL         PostgreSQL
Social graph          SQL         PostgreSQL
Inventory             SQL         PostgreSQL
User sessions         Key-value   Redis
Cache                 Key-value   Redis
Search                Search      Elasticsearch
Timeline/Feed         Wide-col    Cassandra
Logs/Events           Wide-col    Cassandra
Product catalog       Document    MongoDB
Preferences           Document    MongoDB
```

---

# PART 2: SQL DATABASE DESIGN

## Normalization

```
NORMALIZATION = Reduce data duplication

FIRST NORMAL FORM (1NF):
- Atomic values (no arrays in columns)
- Single value per cell

❌ BAD:
users:
  id | name | hobbies
  1  | John | [reading, coding]

✅ GOOD:
users:
  id | name
  1  | John

hobbies:
  user_id | hobby
  1       | reading
  1       | coding

SECOND NORMAL FORM (2NF):
- All 1NF requirements
- Remove partial dependencies

❌ BAD:
orders:
  order_id | user_id | user_name
  1        | 1       | John

✅ GOOD:
orders:
  order_id | user_id
  1        | 1

users:
  user_id | name
  1       | John

THIRD NORMAL FORM (3NF):
- All 2NF requirements
- Remove transitive dependencies

❌ BAD:
orders:
  order_id | user_id | city_id | city_name
  1        | 1       | 5       | NYC

✅ GOOD:
orders:
  order_id | user_id | city_id
  1        | 1       | 5

cities:
  city_id | city_name
  5       | NYC

TRADE-OFF:
More normalized = More JOIN queries, slower reads
Less normalized (denormalized) = Faster reads, harder updates

RULE: Normalize for writes, denormalize for reads (if needed)
```

---

## Indexing Strategy

```
INDEX = Speed up queries (like book index)

WITHOUT INDEX:
SELECT * FROM users WHERE email = 'john@example.com'
→ Full table scan (slow if millions of users)

WITH INDEX:
CREATE INDEX idx_email ON users(email);
SELECT * FROM users WHERE email = 'john@example.com'
→ Direct lookup (fast!)

TYPES OF INDEXES:

1. PRIMARY KEY INDEX
   - Automatically created
   - Unique, not null
   - One per table

2. UNIQUE INDEX
   CREATE UNIQUE INDEX idx_email ON users(email);
   - Enforces uniqueness
   - Good for: emails, usernames

3. COMPOSITE INDEX
   CREATE INDEX idx_user_order ON orders(user_id, created_at);
   - Index on multiple columns
   - Order matters!
   - Good for: WHERE user_id = ? AND created_at > ?

4. FULL TEXT INDEX
   CREATE FULLTEXT INDEX idx_bio ON users(bio);
   - For text search
   - Good for: Search queries

INDEXING STRATEGY:

✅ CREATE INDEX ON:
- Foreign keys (for JOINs)
- Columns in WHERE clause
- Columns in ORDER BY
- Columns in GROUP BY
- Columns used frequently

❌ DON'T INDEX:
- Columns with low cardinality (few unique values)
- Large columns (TEXT, BLOB)
- Columns rarely queried
- Columns frequently updated

TRADE-OFF:
Indexes speed up reads but slow down writes (index update)

MONITORING:
EXPLAIN SELECT ... → See if index is used
SLOW QUERY LOG → Find unindexed queries
ANALYZE TABLE → Gather statistics
```

---

# PART 3: NOSQL DATABASE DESIGN

## Document Store (MongoDB)

```
DESIGN PRINCIPLES:

1. DENORMALIZE (embed related data)
   Instead of JOIN:
   
   ❌ Normalized (multiple queries):
   Get user → Get orders → Get items (3 queries)
   
   ✅ Denormalized (one query):
   {
     _id: 1,
     name: "John",
     orders: [
       {
         id: 1,
         items: [
           { product: "laptop", price: 1000 },
           { product: "mouse", price: 30 }
         ]
       }
     ]
   }

2. ONE DOCUMENT PER ACCESS PATTERN
   If you always access user + orders together:
   Store together in one document
   
   If you access orders separately:
   Store in separate collection with reference

3. LIMIT ARRAY SIZE
   Avoid arrays that grow unbounded
   
   ❌ BAD:
   {
     user_id: 1,
     comments: [1M comments] // Will grow forever!
   }
   
   ✅ GOOD:
   users: { user_id, name }
   comments: { user_id, comment_text } // Separate collection

SCHEMA DESIGN:

Users:
{
  _id: 1,
  name: "John",
  email: "john@example.com",
  created_at: 2023-01-01
}

Orders:
{
  _id: 1,
  user_id: 1,
  items: [
    { product_id: 1, quantity: 2, price: 50 }
  ],
  total: 100,
  created_at: 2023-02-01
}

INDEX:
db.users.createIndex({ email: 1 })
db.orders.createIndex({ user_id: 1, created_at: -1 })
```

---

## Key-Value Store (Redis)

```
USE CASES:
- Session storage
- Cache
- Real-time counters
- Leaderboards
- Rate limiting
- Message queue

DESIGN PATTERNS:

1. CACHING (Cache-aside)
   get(key):
     if key in cache: return value
     else: value = db.get(key)
          cache.set(key, value)
          return value

2. SESSION STORAGE
   redis.set("session:abc123", {user_id: 1, role: admin})
   redis.expire("session:abc123", 3600) // 1 hour

3. COUNTERS
   redis.incr("views:post:1") // Increment view count
   redis.get("views:post:1") // Get current count

4. LEADERBOARD
   redis.zadd("leaderboard", 100, "user1")
   redis.zadd("leaderboard", 200, "user2")
   redis.zrevrange("leaderboard", 0, 9) // Top 10

5. RATE LIMITING
   redis.incr("rate:user:1:2023-02-01")
   redis.expire("rate:user:1:2023-02-01", 86400)
   if redis.get(...) > limit: reject()

RETENTION:
redis.expire(key, seconds) // Auto-delete after time
redis.ttl(key) // Check time until deletion

TRADE-OFF:
- Ultra-fast (in-memory)
- Limited query capabilities
- Data must fit in RAM
```

---

# PART 4: READ/WRITE PATTERNS

## Read-Heavy Systems

```
EXAMPLE: Twitter feed (read >> write)

PATTERN:
- 99% reads, 1% writes
- Each read needs to be fast

OPTIMIZATION:

1. HEAVY CACHING
   Get feed from cache (return in 10ms)
   Invalidate on new tweet (write-time cost)

2. DENORMALIZATION
   Store tweet + user info together
   Avoid JOINs

3. READ REPLICAS
   Master: Takes writes
   Slaves: Handle reads (3-5 replicas)
   Each slave can do 1000 QPS reads

4. MATERIALIZED VIEWS
   Pre-compute results
   Update on writes

ARCHITECTURE:
User → Cache (Redis) → Hit? Return
                     → Miss? Go to DB
                              Update cache
                              Return

Database:
Master (write) ← Replicate → Slaves (read-only)
                                  ├─ Slave 1
                                  ├─ Slave 2
                                  └─ Slave 3
```

---

## Write-Heavy Systems

```
EXAMPLE: Analytics/logs (write >> read)

PATTERN:
- 99% writes, 1% reads
- Each write needs to be fast

OPTIMIZATION:

1. BATCH WRITES
   Don't write immediately
   Collect in buffer, write in bulk
   
   Instead of: 1M writes/second
   Do: Write 100k records per batch (10x faster)

2. ASYNC WRITES
   Write to message queue (fast)
   Process asynchronously (slow)
   User doesn't wait

3. SHARDING BY TIME
   Today's data → Shard 1
   Yesterday's data → Shard 2
   
   Benefit: Easy to delete old data (drop shard)

4. COLUMN STORE
   Cassandra, HBase designed for write-heavy
   Optimized for sequential writes

ARCHITECTURE:
High-write load
       ↓
Message Queue (Kafka)
       ↓
Batch Writer (100k per batch)
       ↓
Database Shards
├─ Shard 1 (Time: 2023-02-01)
├─ Shard 2 (Time: 2023-02-02)
└─ Shard 3 (Time: 2023-02-03)
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: Design schema for social media (posts, comments, likes)

**Answer:**
```
ENTITIES:
- Users (id, name, email)
- Posts (id, user_id, content, created_at)
- Comments (id, post_id, user_id, content, created_at)
- Likes (id, post_id, user_id, created_at)

SQL SCHEMA:

CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT FOREIGN KEY,
  content TEXT,
  created_at TIMESTAMP,
  INDEX(user_id),
  INDEX(created_at)
);

CREATE TABLE comments (
  id INT PRIMARY KEY,
  post_id INT FOREIGN KEY,
  user_id INT FOREIGN KEY,
  content TEXT,
  created_at TIMESTAMP,
  INDEX(post_id, created_at),
  INDEX(user_id)
);

CREATE TABLE likes (
  id INT PRIMARY KEY,
  post_id INT FOREIGN KEY,
  user_id INT FOREIGN KEY,
  created_at TIMESTAMP,
  UNIQUE(post_id, user_id),
  INDEX(user_id)
);

QUERIES:
- Get user posts: SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
- Get post comments: SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC
- Get post likes: SELECT COUNT(*) FROM likes WHERE post_id = ?
- Check if user liked: SELECT * FROM likes WHERE post_id = ? AND user_id = ?

SCALING:
- Add read replicas for read-heavy operations
- Cache popular posts
- Shard comments/likes by post_id if > 1M posts
```

---

## Question 2: SQL vs NoSQL - which to use?

**Answer:**
```
USE SQL WHEN:
✅ Structured data with clear schema
✅ Complex queries with JOINs
✅ ACID transactions needed
✅ Data relationships important
✅ Moderate scale (< 1M QPS writes)

Examples: User accounts, orders, inventory

USE NoSQL WHEN:
✅ Massive scale (> 1M QPS)
✅ Unstructured/semi-structured data
✅ High write throughput
✅ Simple access patterns
✅ Schema flexibility needed

Examples: Logs, events, feeds, sessions, cache

HYBRID APPROACH (Best):
- SQL for relational data (users, orders)
- Cache (Redis) for frequently accessed data
- NoSQL for high-volume data (logs, events)
- Elasticsearch for searching
- Data warehouse (Snowflake) for analytics
```

---

# SUMMARY: Database Design

✅ **SQL:**
- [ ] Know normalization
- [ ] Know indexing strategy
- [ ] Know when to denormalize
- [ ] Understand schema design

✅ **NoSQL:**
- [ ] Know document store design
- [ ] Know denormalization benefits
- [ ] Know key-value patterns
- [ ] Know limitations

✅ **Read/Write Patterns:**
- [ ] Know read-heavy optimization
- [ ] Know write-heavy optimization
- [ ] Understand caching strategy
- [ ] Know replication vs sharding

---

**Master database design—it's 15% of system design!**
