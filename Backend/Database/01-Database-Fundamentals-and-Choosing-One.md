# Database Fundamentals and Choosing the Right One

"Which database would you use for this?" is one of the most common full-stack interview questions, and the strong answer is never "Postgres for everything" or "MongoDB because it's flexible" — it's picking the database whose actual strengths match what the feature needs, and being able to say why.

## 1. What a DBMS Actually Does

A **DBMS** (Database Management System) stores data and gives you a way to query, update, and protect it without hand-rolling file I/O yourself. A **RDBMS** (Relational DBMS — PostgreSQL, MySQL, Oracle, SQL Server) organizes data into **tables** with a fixed schema, related to each other through **foreign keys**, and queried with SQL. Everything in this folder assumes an RDBMS unless stated otherwise, because that's still the default choice for most application data and the most heavily interview-tested.

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

This `users`/`orders` schema is the running example for every file in this folder — the same tables show up in the SQL queries, joins, indexing, and transaction examples that follow, so you can see one consistent real schema instead of a new toy example every section.

## 2. SQL vs NoSQL — the Actual Decision, Not a Slogan

| | SQL (Relational) | NoSQL |
|---|---|---|
| Schema | Fixed, defined up front | Flexible — each document/row can differ |
| Relationships | First-class (foreign keys, joins) | Usually denormalized or embedded |
| Consistency | Strong (ACID by default) | Often "eventual," tunable per system |
| Scaling | Vertically easier; horizontal scaling (sharding) needs real work | Horizontal scaling is often a built-in design goal |
| Best fit | Data with real relationships and invariants that must never be violated | High write/read volume, flexible/evolving structure, or a specific access pattern a relational model doesn't suit |

The honest, senior-level answer isn't "SQL is better" or "NoSQL is more scalable" — it's matching the tool to the actual access pattern:

- **User accounts, orders, payments, inventory** — relational. These have real relationships (a user has orders, an order has line items referencing products) and invariants that must hold (an order total must match its line items, a payment must reference a real order) — exactly what foreign keys and transactions (see the [ACID guide](04-ACID-Properties-and-Transactions.md)) are built to enforce.
- **A session store or a cache** — Redis (an in-memory key-value store). Sessions are short-lived, looked up by a single key, and don't need joins or complex queries — paying for a full RDBMS round-trip for "is this session token valid" is real, unnecessary overhead.
- **A product catalog with wildly varying attributes per category** (a laptop has RAM/CPU; a T-shirt has size/color) — a document store like MongoDB fits naturally, since forcing every possible attribute into a rigid relational schema means either a sparse table full of nulls or an awkward key-value attribute table that's painful to query.
- **Full-text product search** ("wireless noise cancelling headphones under $100") — Elasticsearch, purpose-built for relevance-ranked text search; a SQL `LIKE '%...%'` query cannot rank by relevance and gets slow fast at scale.
- **A social graph** (who follows whom, friend-of-a-friend queries) — a graph database (Neo4j) if the traversal patterns get deep; a few levels of relationship are fine in SQL with recursive CTEs, but "find mutual connections 4 hops away" is what graph databases are actually built to make fast.
- **Time-series metrics or event logs at high write volume** — a columnar/time-series store (ClickHouse, TimescaleDB, InfluxDB), because analytical queries over huge volumes of similarly-shaped rows favor column-oriented storage over row-oriented.

A real production system usually **combines several of these** — Postgres for the core transactional data, Redis for sessions/caching, Elasticsearch for search — rather than picking one database for the entire application. Sharding, replication, and CAP-theorem trade-offs for scaling any of these further are covered in the [System Design Database guide](../../SystemDesign/03-Database-Design.md); this folder focuses on the SQL/relational fundamentals underneath the application layer.

## 3. Types of NoSQL, Briefly

| Type | Example | Real use case |
|---|---|---|
| Key-Value | Redis, DynamoDB | Session storage, caching, rate-limit counters |
| Document | MongoDB, Couchbase | Product catalogs, content management, flexible per-record schemas |
| Column-family | Cassandra, HBase | Massive write throughput, time-series/event data |
| Graph | Neo4j | Social graphs, recommendation engines, fraud-ring detection |

## 4. What a Full-Stack Interview Actually Probes Here

The question is rarely "define NoSQL" — it's a scenario: "we're building a checkout flow, what database and why?" (relational — money and inventory need strong consistency and joins), or "we're building a Twitter-like feed, what about the timeline?" (often a hybrid: Postgres for tweets/relationships, a cache or a denormalized feed table for fast timeline reads, since re-joining "who does this user follow" on every page load doesn't scale). The strong answer always names the actual access pattern and the actual constraint (consistency need, query shape, write volume) driving the choice.

## Interview Questions and Answers

### 1. When would you choose a relational database over a document store for a new feature?

**Answer:** When the data has real relationships that need to stay consistent — an order referencing a user and line items referencing products, where the total must always match the line items — and where you need transactional guarantees across multiple related writes at once. A document store makes that harder because it favors denormalized, embedded data without built-in cross-document transactional guarantees as strong as an RDBMS's.

### 2. Why is Redis a better fit than PostgreSQL for session storage?

**Answer:** Sessions are short-lived, looked up by a single key, and don't need relationships or complex queries — exactly what an in-memory key-value store is optimized for, with far lower latency than a full relational round-trip. Redis also supports a native TTL (expiration) on keys, which maps directly onto session expiry without extra cleanup logic.

### 3. Why might a product catalog fit a document store better than a rigid relational table?

**Answer:** Different product categories have genuinely different attributes (a laptop has RAM/CPU, a T-shirt has size/color), and forcing all of them into one fixed relational schema produces either a sparse table full of unused nullable columns or an awkward generic attribute table that's painful to query. A document store lets each product document carry only the fields relevant to its own category.

### 4. Why is a SQL `LIKE '%keyword%'` query a poor substitute for a real search feature?

**Answer:** `LIKE` with leading wildcards can't use a standard index efficiently, so it degrades to a full table scan as data grows, and it has no concept of relevance ranking — it can't tell you which of several matches is the "best" one. A search engine like Elasticsearch is purpose-built for tokenized, relevance-ranked, typo-tolerant full-text search at scale.

### 5. Why do real production systems often use several different databases instead of one?

**Answer:** Because different parts of an application have genuinely different access patterns — transactional core data needs relational consistency, sessions need fast key-value lookups, search needs relevance ranking — and no single database is optimal at all three simultaneously. Using the right tool per access pattern (Postgres + Redis + Elasticsearch, for example) is normal architecture, not over-engineering.

## Revision Checklist

- [ ] Explain what a DBMS/RDBMS is and describe the `users`/`orders` schema used throughout this folder.
- [ ] Justify SQL vs NoSQL for a stated real feature by its actual access pattern, not a general preference.
- [ ] Name the four common NoSQL types (key-value, document, column-family, graph) and a real use case for each.
- [ ] Explain why a real production system often combines multiple databases rather than picking just one.
