# Indexes and Query Optimization

"How would you speed up this slow query" is a guaranteed question once you're past junior level, and the strong answer walks through a real diagnostic process — read the query plan, find the full table scan, add the right index, verify it's actually used — rather than reciting "add an index" as a magic word.

## 1. What an Index Actually Is

An index is a separate, sorted data structure (typically a B-tree) that lets the database find rows matching a condition without scanning every row in the table — the same idea as a book's index letting you jump to a page instead of reading cover to cover. Without one:

```sql
SELECT * FROM orders WHERE user_id = 42; -- with no index on user_id, this scans EVERY row in orders
```

```sql
CREATE INDEX idx_orders_user_id ON orders (user_id);
-- the same query now walks a B-tree to jump almost directly to the matching rows
```

The trade-off that makes "just index everything" wrong: every index speeds up reads that filter/sort on it, but it also has to be updated on every `INSERT`/`UPDATE`/`DELETE` that touches the indexed column — so indexes cost write performance and storage, and adding one to a column that's rarely queried is pure overhead with no benefit.

## 2. Reading a Query Plan — the Actual Diagnostic Skill

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42;
```

```text
-- Without an index:
Seq Scan on orders (cost=0.00..1834.00 rows=12 width=64)
  Filter: (user_id = 42)
-- "Seq Scan" means every single row in the table was checked — the real red flag on a large table

-- With an index:
Index Scan using idx_orders_user_id on orders (cost=0.29..8.31 rows=12 width=64)
  Index Cond: (user_id = 42)
-- "Index Scan" means the B-tree was used to jump almost directly to the matching rows
```

`EXPLAIN` (or `EXPLAIN ANALYZE`, which actually runs the query and reports real timing) is the real, non-negotiable first step before "adding an index" — it tells you *whether* the database is even using an index that already exists, and *which* step in a complex query is actually expensive. Guessing which index to add without looking at the plan first is how you end up with unused indexes that only cost write performance.

## 3. Composite Indexes — Column Order Genuinely Matters

```sql
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Uses the index efficiently — filters on the LEADING column (user_id)
SELECT * FROM orders WHERE user_id = 42 AND status = 'PENDING';
SELECT * FROM orders WHERE user_id = 42; -- also uses it — a prefix of the index still works

-- Does NOT use this index efficiently — status is not the leading column
SELECT * FROM orders WHERE status = 'PENDING';
```

A composite (multi-column) index only helps a query that filters on a **left-to-right prefix** of its columns — exactly like a phone book sorted by last name, then first name: you can efficiently look up everyone with a given last name, or a given last-name-and-first-name pair, but you can't efficiently jump straight to everyone with a given first name alone, because the book isn't sorted by first name first. The real, practical rule: put the column used in an equality filter (`= value`) before a column used in a range filter (`> value`, `BETWEEN`) or a sort, and put the column most commonly filtered alone first.

## 4. Covering Indexes — Avoiding a Trip Back to the Table

```sql
CREATE INDEX idx_orders_covering ON orders (user_id, status, total);

-- This query can be answered ENTIRELY from the index — no need to fetch the actual table row at all
SELECT status, total FROM orders WHERE user_id = 42;
```

If every column a query needs (both in `WHERE` and in `SELECT`) is present in the index itself, the database can answer the query straight from the index without an extra lookup into the actual table row — a real, measurable speedup for read-heavy queries, at the cost of a larger index (since it now duplicates more column data).

## 5. What an Index Cannot Fix

```sql
-- A leading wildcard defeats a standard B-tree index — it can't binary-search for "starts with anything"
SELECT * FROM users WHERE email LIKE '%@gmail.com'; -- index NOT used efficiently

-- Applying a function to the indexed column also defeats a plain index, unless the index itself
-- is built on that same expression
SELECT * FROM users WHERE LOWER(email) = 'ana@example.com'; -- index on `email` is not used here

CREATE INDEX idx_users_email_lower ON users (LOWER(email)); -- a functional index fixes exactly this case
```

An index is built on the literal column value — the moment a query transforms that value before comparing (`LOWER(...)`, a leading `%wildcard`, a calculation), the database generally can't use a plain index to satisfy it, because the index was never sorted by that transformed value. This is exactly why "why isn't my index being used" so often traces back to a function wrapped around the column in the `WHERE` clause, and why a **functional index** (built on the expression itself) is the real fix rather than adding yet another plain index that still won't match.

## 6. The N+1 Query Problem — a Query-Count Bug, Not a Missing-Index Bug

```java
List<Order> orders = orderRepository.findAll();       // 1 query
for (Order order : orders) {
    order.getLines().size();                            // 1 query PER order — the N+1 bug
}
```

This is covered in full depth (with the JPA-specific fetch-join fix) in the [Database/JPA/Hibernate guide](../Springboot/03-Database-JPA-Hibernate.md#6-n1-and-lazy-loading) — worth cross-referencing here because it's the other classic "why is this endpoint slow" root cause, and it's genuinely not an indexing problem: no index speeds up making 101 round trips to the database instead of 1 or 2. Diagnosing it needs SQL query-count logging, not `EXPLAIN`.

## Interview Questions and Answers

### 1. Why shouldn't you just add an index to every column "to be safe"?

**Answer:** Every index has to be maintained on every write that touches its column, so more indexes mean slower `INSERT`/`UPDATE`/`DELETE` and more storage used, not just faster reads. An index on a rarely-queried column is pure overhead — the right approach is identifying which queries are actually slow (via `EXPLAIN`) and indexing to fix those specifically.

### 2. What does `EXPLAIN` (or `EXPLAIN ANALYZE`) actually tell you, and why is it the right first step before adding an index?

**Answer:** It shows the actual query plan the database chose — whether it did a full table scan (`Seq Scan`) or used an index (`Index Scan`), and with `ANALYZE`, real execution timing. It's the right first step because it tells you definitively whether an index is missing, or an existing index simply isn't being used for a specific query — guessing which index to add without this is how teams end up with unused indexes that only cost write performance.

### 3. Why does column order matter in a composite index?

**Answer:** A composite index is only efficiently searchable by a left-to-right prefix of its columns, the same way a phone book sorted by last-name-then-first-name lets you search by last name alone but not by first name alone. Put the column most commonly filtered by itself (or with an equality condition) first, and range/sort conditions after it.

### 4. What is a covering index, and why is it faster?

**Answer:** It's an index that includes every column a query needs, both for filtering and for the result — letting the database answer the query directly from the index without a separate lookup into the actual table row. It trades a larger index (since it duplicates more column data) for eliminating that extra row-fetch step entirely.

### 5. Why doesn't an index help a query like `WHERE email LIKE '%@gmail.com'` or `WHERE LOWER(email) = '...'`?

**Answer:** A standard index is sorted by the literal column value, so it can only be used efficiently when the query compares that same literal value directly. A leading wildcard has no fixed prefix to search from, and wrapping the column in a function (`LOWER(...)`) compares a transformed value the index was never sorted by — the real fix for the function case is a functional index built on that exact expression.

### 6. Why is the N+1 query problem not something indexing alone can fix?

**Answer:** N+1 is a query-*count* problem — one query per parent row, multiplying network round trips — not a query-*speed* problem that a missing index would explain. Each of those individual queries might already be fast and fully indexed; the fix is reducing the number of round trips (a fetch join, batch fetching, a projection), not indexing anything further.

## Revision Checklist

- [ ] Explain what an index is and the real write/storage cost trade-off of adding one.
- [ ] Read an `EXPLAIN` plan and identify a full table scan versus an index scan.
- [ ] Design a composite index with the correct column order for a stated real query.
- [ ] Explain a covering index and when it's worth the extra storage.
- [ ] Identify why a `LIKE '%...'` or a function-wrapped `WHERE` clause defeats a plain index, and know the functional-index fix.
- [ ] Distinguish an indexing problem from an N+1 query-count problem when diagnosing a slow endpoint.
