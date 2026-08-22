# SQL Queries: From Basics to Real-World Patterns

Every backend and full-stack interview eventually hands you a schema and asks you to write a query live. This guide starts from the absolute basics and builds up to the patterns that actually show up in real applications, using the same `users`/`orders` schema from the [Database Fundamentals guide](01-Database-Fundamentals-and-Choosing-One.md), plus two more tables to make joins and aggregation meaningful:

```sql
CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL
);

CREATE TABLE order_items (
    id BIGINT PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);
```

## 1. The Basic Four: SELECT, INSERT, UPDATE, DELETE

```sql
-- SELECT: read data
SELECT id, name, email FROM users;

-- INSERT: create a new row
INSERT INTO users (id, email, name, created_at)
VALUES (1, 'ana@example.com', 'Ana Rivera', now());

-- UPDATE: modify existing rows — ALWAYS pair with WHERE, or every row gets updated
UPDATE orders SET status = 'SHIPPED' WHERE id = 42;

-- DELETE: remove rows — same rule: WHERE is not optional in practice
DELETE FROM orders WHERE status = 'CANCELLED' AND created_at < '2024-01-01';
```

The single most important habit here: `UPDATE`/`DELETE` without a `WHERE` clause applies to **every row in the table** — a real, career-defining production incident is one missing `WHERE` clause on a `DELETE`. Always run the equivalent `SELECT` with the same `WHERE` clause first to see exactly which rows would be affected, before running the actual `UPDATE`/`DELETE`.

## 2. Filtering, Sorting, and Limiting

```sql
SELECT id, total, status
FROM orders
WHERE status = 'PENDING' AND total > 100
ORDER BY created_at DESC
LIMIT 20;
```

`WHERE` filters rows before any grouping happens. `ORDER BY` sorts the result set (`ASC` is the default; `DESC` for descending). `LIMIT` caps how many rows come back — essential for pagination and for not accidentally pulling millions of rows into your application. Combine conditions with `AND`/`OR`, use `IN (...)` instead of chaining several `OR`s on the same column, and use `BETWEEN` for a range:

```sql
SELECT * FROM orders WHERE status IN ('PENDING', 'PROCESSING');
SELECT * FROM orders WHERE total BETWEEN 50 AND 200;
SELECT * FROM users WHERE email LIKE '%@gmail.com'; -- pattern match, see the search caveat in the previous guide
```

## 3. Aggregation: GROUP BY and HAVING

```sql
-- "How many orders has each user placed, and what's their total spend?"
SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
FROM orders
GROUP BY user_id
HAVING SUM(total) > 500 -- filters GROUPS, applied after aggregation
ORDER BY total_spent DESC;
```

`GROUP BY` collapses rows sharing the same value in a column into one row per group, and aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) then compute over each group. The real, commonly-tested distinction: **`WHERE` filters rows before grouping; `HAVING` filters groups after aggregation** — you can't write `WHERE SUM(total) > 500` because `WHERE` runs before `SUM` has been computed at all; `HAVING` exists specifically to filter on an aggregated value.

## 4. Subqueries

```sql
-- Users who have placed at least one order over $1000
SELECT name, email
FROM users
WHERE id IN (
    SELECT user_id FROM orders WHERE total > 1000
);
```

A subquery is a query nested inside another one — here, the inner query produces a list of `user_id`s, and the outer query filters `users` against that list. Subqueries are readable for this kind of "filter by a condition on related data" question, but a join (Section 6, and the [dedicated Joins guide](03-SQL-Joins-Explained.md)) is often the more efficient and more idiomatic tool when you also need columns *from* the related table, not just a filter based on it.

## 5. Common Table Expressions (CTEs) — Naming a Subquery for Readability

```sql
WITH high_value_orders AS (
    SELECT user_id, total
    FROM orders
    WHERE total > 1000
)
SELECT u.name, h.total
FROM users u
JOIN high_value_orders h ON h.user_id = u.id;
```

A CTE (`WITH ... AS (...)`) is a named, temporary result set you can reference like a table for the rest of the query — functionally similar to a subquery, but far more readable once a query has several nested filtering steps, since each step gets its own name instead of a wall of nested parentheses. CTEs can also be chained one after another, each building on the last, which is the real reason they're preferred over deeply nested subqueries in any query complex enough to need more than one filtering step.

## 6. A Preview of Joins

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'PENDING';
```

This combines rows from `users` and `orders` based on the relationship between them (`o.user_id = u.id`) — the single most common real query shape, and important enough to warrant its own guide: see [SQL Joins Explained](03-SQL-Joins-Explained.md) for `INNER`/`LEFT`/`RIGHT`/`FULL`/`SELF`/`CROSS` joins in depth.

## 7. Window Functions — Aggregating Without Collapsing Rows

```sql
-- Rank each user's orders by size, WITHOUT collapsing multiple orders per user into one row
SELECT
    user_id,
    id AS order_id,
    total,
    RANK() OVER (PARTITION BY user_id ORDER BY total DESC) AS order_rank
FROM orders;
```

`GROUP BY` collapses rows into one per group; a window function (`OVER (...)`) computes an aggregate or ranking **per row**, without collapsing anything — each original order row stays in the result, now annotated with its rank among that user's own orders. `PARTITION BY` is the window-function equivalent of `GROUP BY` (it defines the "group" the calculation is scoped to), while `ORDER BY` inside the `OVER (...)` clause defines the ordering the ranking/running-total is computed against. A real use case: "show me every order, plus its rank among that customer's orders" — a report `GROUP BY` alone cannot produce, because grouping would collapse the individual order rows you still need to see.

## Interview Questions and Answers

### 1. What's the practical difference between `WHERE` and `HAVING`?

**Answer:** `WHERE` filters individual rows before any grouping or aggregation happens. `HAVING` filters entire groups after aggregation, which is why it can reference an aggregate function like `SUM(total)` while `WHERE` cannot — at the point `WHERE` runs, no aggregation has been computed yet.

### 2. Why is running an `UPDATE`/`DELETE` without a `WHERE` clause dangerous, and what's the safe habit around it?

**Answer:** Without `WHERE`, the statement applies to every row in the table, which is a real, common cause of serious production incidents. The safe habit is running the equivalent `SELECT` with the exact same `WHERE` clause first, confirming it returns only the intended rows, before running the actual `UPDATE`/`DELETE`.

### 3. When would you reach for a CTE instead of a plain subquery?

**Answer:** When a query needs several sequential filtering or transformation steps — a CTE names each step, making the query readable top to bottom, whereas the equivalent nested subqueries force the reader to parse from the innermost parentheses outward. CTEs can also be chained, each building on the previous one, which nested subqueries can't do cleanly.

### 4. What's the real difference between using `GROUP BY` and using a window function for a ranking query?

**Answer:** `GROUP BY` collapses all rows in a group into a single summary row, losing the individual rows. A window function (`RANK() OVER (PARTITION BY ... ORDER BY ...)`) computes the same kind of per-group calculation but keeps every original row intact, just annotated with the computed value — needed whenever you want both the aggregate/ranking and the individual row-level detail in the same result.

### 5. Why would you use a subquery with `IN (...)` versus a join when filtering by a related table?

**Answer:** A subquery with `IN` is a clean, readable choice when you only need to filter the outer table based on a condition in the related table and don't need any columns *from* that related table in the result. A join is the right tool the moment you also need to select or display columns from the related table alongside the outer table's columns.

## Revision Checklist

- [ ] Write basic `SELECT`/`INSERT`/`UPDATE`/`DELETE` statements, and explain why `WHERE` is non-negotiable on the latter two.
- [ ] Explain the `WHERE` vs `HAVING` distinction precisely, including why `HAVING` can reference aggregates and `WHERE` can't.
- [ ] Write a `GROUP BY` aggregation query with a `HAVING` filter on the aggregated value.
- [ ] Rewrite a subquery-based filter as an equivalent join, and explain when each is the better choice.
- [ ] Write a CTE that names an intermediate step instead of nesting a subquery.
- [ ] Write a window function query and explain how it differs from an equivalent `GROUP BY`.
