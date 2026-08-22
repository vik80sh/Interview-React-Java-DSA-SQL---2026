# Database Interview Roadmap

This folder covers the SQL/database fundamentals every full-stack and backend interview eventually touches: choosing the right database, writing real queries, joins (explained precisely, not just "inner keeps matches"), ACID, and the schema/indexing decisions behind a fast, correct application. One consistent `users`/`orders`/`products`/`order_items` schema runs through every file.

## Recommended Order

1. [Database Fundamentals and Choosing One](01-Database-Fundamentals-and-Choosing-One.md)
2. [SQL Queries: From Basics to Real-World Patterns](02-SQL-Queries-Fundamentals.md)
3. [SQL Joins, Explained Properly](03-SQL-Joins-Explained.md)
4. [ACID Properties and Transactions](04-ACID-Properties-and-Transactions.md)
5. [Isolation Levels and Concurrency Anomalies](05-Isolation-Levels-and-Concurrency-Anomalies.md)
6. [Indexes and Query Optimization](06-Indexes-and-Query-Optimization.md)
7. [Normalization and Schema Design](07-Normalization-and-Schema-Design.md)
8. [NoSQL in Practice: MongoDB and Redis](08-NoSQL-MongoDB-and-Redis-Deep-Dive.md)

This folder assumes the [Springboot folder](../Springboot/INDEX.md)'s JPA/Hibernate guide for how these SQL concepts map onto Java entities, transactions, and the N+1 problem specifically. For sharding, replication, and CAP-theorem trade-offs at real distributed scale, see [SystemDesign/03-Database-Design.md](../../SystemDesign/03-Database-Design.md) — this folder stays at the SQL/schema/transaction layer underneath that.

## What Mastery Looks Like

- You can justify a database choice for a real scenario by its actual access pattern, not a slogan.
- You can predict the exact result set — including every `NULL` — for a join query you've never seen before.
- You can explain each ACID letter with a concrete failure mode, not a one-word definition.
- You can read an `EXPLAIN` plan and explain why a specific query is slow, before proposing a fix.
- You can spot a normalization violation and also justify a deliberate denormalization decision with its real cost.

## Final Readiness Checklist

- [ ] Choose the right database (relational, key-value, document, graph, search, column-family) for a stated real feature.
- [ ] Write basic `SELECT`/`INSERT`/`UPDATE`/`DELETE`, `GROUP BY`/`HAVING`, a subquery, a CTE, and a window function.
- [ ] Trace `INNER`/`LEFT`/`RIGHT`/`FULL OUTER`/`SELF`/`CROSS` joins by hand on a small dataset and predict every `NULL`.
- [ ] Explain all four ACID properties using a real money-transfer failure mode for each.
- [ ] Name dirty reads, non-repeatable reads, and phantom reads, and map each to the isolation level that prevents it.
- [ ] Read an `EXPLAIN` plan, add the correct index (including column order for a composite index), and explain what an index can't fix.
- [ ] Identify a 1NF/2NF/3NF violation and justify a real denormalization trade-off.
- [ ] Model a real MongoDB document (embed vs reference) and match a real problem to the right Redis data structure.
