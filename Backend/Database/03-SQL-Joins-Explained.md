# SQL Joins, Explained Properly

Joins are asked about in almost every SQL interview, and almost everyone can recite "inner join returns matching rows" — but the real test is being able to predict the *exact* result set, including which rows get `NULL`s, for a query you've never seen before. This guide builds that intuition with one consistent, tiny dataset you can trace by hand.

## 0. The Dataset We'll Trace Through Every Example

```sql
-- users
id | name
1  | Ana
2  | Ben
3  | Cara      -- Cara has never placed an order

-- orders
id | user_id | total
10 | 1       | 50.00
11 | 1       | 120.00
12 | 2       | 30.00
13 | 99      | 75.00   -- references a user_id that doesn't exist in `users`
```

Two deliberate details make this dataset useful: **Cara (id 3) has no orders**, and **order 13 references `user_id = 99`, which has no matching user** — a realistic case of an orphaned foreign key (perhaps that user was deleted). Every join type below produces a different, predictable result specifically *because* of these two rows.

## 1. INNER JOIN — Only Rows That Match on Both Sides

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
```

```text
name | order_id | total
Ana  | 10       | 50.00
Ana  | 11       | 120.00
Ben  | 12       | 30.00
```

Cara disappears entirely (no matching order), and order 13 disappears entirely (no matching user) — `INNER JOIN` keeps only rows where the join condition actually matched on **both** sides. This is the default join type if you just write `JOIN` with no keyword in front of it.

## 2. LEFT JOIN — Every Row From the Left Table, Matched or Not

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

```text
name | order_id | total
Ana  | 10       | 50.00
Ana  | 11       | 120.00
Ben  | 12       | 30.00
Cara | NULL     | NULL
```

Every row from `users` (the "left" table, the one named first) appears at least once, regardless of whether it found a match. Cara now appears, with `NULL` in every column that came from `orders` — because there was no matching order row to pull those values from. This is the real-world query for "show me every user, including ones with zero orders" — a report an `INNER JOIN` cannot produce, because it silently drops exactly the rows you'd want to see in that report.

**The single most common real bug this creates:** filtering on `orders.status` in a `WHERE` clause after a `LEFT JOIN` silently turns it back into something closer to an inner join, because `WHERE o.status = 'PENDING'` also excludes Cara's `NULL` row (`NULL = 'PENDING'` is neither true nor false — it's `NULL`, and `WHERE` only keeps rows where the condition is true). The fix is moving that condition into the `ON` clause instead:

```sql
-- Wrong intent: silently drops users with NO orders at all, defeating the point of LEFT JOIN
SELECT u.name, o.id, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'PENDING';

-- Correct: filters WHICH orders join, but still keeps every user
SELECT u.name, o.id, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'PENDING';
```

## 3. RIGHT JOIN — the Mirror Image of LEFT JOIN

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
RIGHT JOIN orders o ON o.user_id = u.id;
```

```text
name | order_id | total
Ana  | 10       | 50.00
Ana  | 11       | 120.00
Ben  | 12       | 30.00
NULL | 13       | 75.00
```

Every row from `orders` (the "right" table) appears, regardless of match — order 13 now shows up with `NULL` for `name`, since its `user_id = 99` matches nothing in `users`. `RIGHT JOIN` is functionally identical to swapping the table order and using `LEFT JOIN` — in practice, most people write every query as `LEFT JOIN` and just reorder the tables, rather than ever using `RIGHT JOIN`, purely for consistency and readability across a codebase.

## 4. FULL OUTER JOIN — Everything From Both Sides

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
FULL OUTER JOIN orders o ON o.user_id = u.id;
```

```text
name | order_id | total
Ana  | 10       | 50.00
Ana  | 11       | 120.00
Ben  | 12       | 30.00
Cara | NULL     | NULL
NULL | 13       | 75.00
```

This combines `LEFT JOIN` and `RIGHT JOIN`'s behavior: every row from **both** tables appears at least once, with `NULL`s filled in wherever there was no match on the other side. A real use case: a data-reconciliation report that needs to surface both "users with no orders" and "orders with no valid user" in one query — exactly the kind of orphaned-data audit this dataset was built to demonstrate. (MySQL has no native `FULL OUTER JOIN`; it's typically emulated with a `LEFT JOIN UNION a RIGHT JOIN`.)

## 5. SELF JOIN — Joining a Table to Itself

```sql
-- Find pairs of users who share the same referrer (assume users has a referred_by column)
SELECT a.name AS user_a, b.name AS user_b, a.referred_by
FROM users a
JOIN users b ON a.referred_by = b.referred_by AND a.id < b.id;
```

A self join is just a normal join where both "tables" happen to be the same table, given two different aliases (`a` and `b` here) so SQL can tell which occurrence of a column you mean. The classic real use case is a hierarchical relationship stored in one table — an `employees` table with a `manager_id` column pointing back to another row in the same table — where you join `employees e1` to `employees e2 ON e1.manager_id = e2.id` to pull in each employee's manager's name.

## 6. CROSS JOIN — Every Combination of Both Tables

```sql
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;
```

A `CROSS JOIN` has no join condition at all — it produces every possible combination of rows from both tables (a **Cartesian product**: if `sizes` has 4 rows and `colors` has 6, the result has 24 rows). The real, legitimate use case is generating combinations deliberately, like every size/color variant of a product before inserting them as rows. The real danger: accidentally writing a join with **no `ON` condition and no `CROSS JOIN` keyword** (an old-style comma join, `FROM a, b`) produces the same Cartesian explosion by mistake, silently multiplying your row count and producing a wrong, bloated result set with no error at all.

## Interview Questions and Answers

### 1. What's the exact difference between `INNER JOIN` and `LEFT JOIN`, precisely (not just "one keeps unmatched rows")?

**Answer:** `INNER JOIN` keeps only rows where the join condition matches on both tables — any row from either side with no match disappears entirely. `LEFT JOIN` keeps every row from the left (first-named) table regardless of whether it matched, filling in `NULL` for every column that would have come from the right table when there was no match.

### 2. Why does adding a `WHERE` condition on the right-hand table after a `LEFT JOIN` sometimes silently behave like an `INNER JOIN`?

**Answer:** A row that had no match produces `NULL` for the right table's columns, and comparing `NULL` to any value in a `WHERE` clause evaluates to `NULL` (neither true nor false), which `WHERE` excludes. That silently removes exactly the unmatched rows a `LEFT JOIN` was meant to preserve — the fix is moving that condition into the `ON` clause, where it only affects which rows join, not whether the left row survives at all.

### 3. What does a `FULL OUTER JOIN` return that neither a `LEFT` nor `RIGHT JOIN` alone can?

**Answer:** It returns every row from both tables — unmatched rows from the left table (with `NULL`s for right-table columns) and unmatched rows from the right table (with `NULL`s for left-table columns) — in one result set. A `LEFT JOIN` alone would miss the right table's orphaned rows, and a `RIGHT JOIN` alone would miss the left table's orphaned rows.

### 4. What is a self join, and what's a classic real use case?

**Answer:** A join where a table is joined to itself, using two different aliases to distinguish the two "copies" being compared. The classic use case is a self-referencing hierarchy — an `employees` table with a `manager_id` column pointing to another row in the same table — joined to pull each employee's manager's details.

### 5. What is a `CROSS JOIN`, and why is an accidental one a real danger?

**Answer:** It's every combination of rows from both tables (a Cartesian product) with no join condition at all — deliberately useful for generating combinations, like every size/color variant of a product. The danger is an *accidental* Cartesian product from a join with no `ON` condition (an old comma-style join), which silently multiplies the row count without any error, producing a bloated, wrong result set that's easy to miss in a quick visual check.

### 6. Why do most engineers avoid `RIGHT JOIN` in practice even though it's valid SQL?

**Answer:** `RIGHT JOIN` is functionally identical to reordering the tables and writing `LEFT JOIN` instead, so most style conventions standardize on always using `LEFT JOIN` and putting the table whose unmatched rows you want to keep first — purely for consistency and readability across a codebase, not because `RIGHT JOIN` is technically wrong.

## Revision Checklist

- [ ] Trace the sample dataset by hand through `INNER`, `LEFT`, `RIGHT`, and `FULL OUTER` joins and predict every `NULL`.
- [ ] Explain and fix the `WHERE`-after-`LEFT JOIN` bug by moving the condition into `ON`.
- [ ] Write a self join for a manager/employee-style hierarchy.
- [ ] Explain what a `CROSS JOIN` produces and how an accidental Cartesian product happens.
- [ ] Explain why `RIGHT JOIN` is rarely used in practice despite being valid.
