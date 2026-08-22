# Normalization and Schema Design

Normal forms sound academic, but the real skill being tested is spotting the actual bug each one prevents — a duplicated value that can go out of sync, an update that has to touch ten rows instead of one — and knowing when breaking the rules on purpose (denormalizing) is the right engineering call, not a mistake.

## 1. The Problem Normalization Solves

```text
-- A single, unnormalized "orders" table
order_id | customer_name | customer_email      | product_name | product_price
1        | Ana Rivera     | ana@example.com     | Headphones    | 79.00
2        | Ana Rivera     | ana@example.com     | Keyboard      | 45.00
```

Ana's name and email are duplicated across every order she's ever placed. The real bug this creates: if Ana updates her email, you now have to find and update **every single row** that mentions it — miss one, and the same "customer" now has two different emails on file, with no way to tell which one is current just by looking at the data.

## 2. First Normal Form (1NF) — Atomic Values, No Repeating Groups

```text
-- Violates 1NF: multiple values crammed into one column
order_id | products
1        | "Headphones, Keyboard, Mouse"
```

```sql
-- 1NF: one row per fact, not multiple values packed into a single column
CREATE TABLE order_items (
    order_id INT,
    product_name VARCHAR(200)
);
```

1NF just requires that each column hold one atomic value, not a comma-separated list. The real bug the "products" column above creates: you can't efficiently query "which orders contain a Keyboard" without parsing a string, and you can't enforce a foreign key to a real `products` table from inside that string at all.

## 3. Second Normal Form (2NF) — No Partial Dependency on Part of a Composite Key

```text
-- Violates 2NF: order_date depends only on order_id, not on the full (order_id, product_id) key
order_id | product_id | quantity | order_date
1        | 10         | 2        | 2024-06-01
1        | 11         | 1        | 2024-06-01   -- order_date repeated, depends only on order_id
```

```sql
-- 2NF: split out the part that depends on only ONE piece of the composite key
CREATE TABLE orders (order_id INT PRIMARY KEY, order_date DATE);
CREATE TABLE order_items (order_id INT, product_id INT, quantity INT, PRIMARY KEY (order_id, product_id));
```

2NF applies when a table's primary key is composite (more than one column) — it requires every non-key column to depend on the *whole* key, not just part of it. `order_date` only actually depends on `order_id`, not on `product_id` too, so it's stored redundantly once per line item instead of once per order — exactly the same "which copy is current" problem from Section 1, just triggered by a composite key instead of an obviously duplicated customer.

## 4. Third Normal Form (3NF) — No Transitive Dependency Through a Non-Key Column

```text
-- Violates 3NF: category_description depends on category, not directly on product_id
product_id | category    | category_description
1          | Electronics | "Devices and gadgets"
2          | Electronics | "Devices and gadgets"   -- duplicated again
```

```sql
-- 3NF: category_description belongs with category, not repeated on every product
CREATE TABLE categories (category_id INT PRIMARY KEY, name VARCHAR(50), description VARCHAR(200));
CREATE TABLE products (product_id INT PRIMARY KEY, category_id INT REFERENCES categories(category_id));
```

3NF requires that non-key columns depend directly on the primary key, not on another non-key column (a "transitive" dependency: `product_id → category → category_description`). `category_description` doesn't actually describe the product — it describes the category — so it belongs in its own `categories` table, referenced by a foreign key, not repeated on every product row in that category.

**The practical, most-quoted summary of 1NF/2NF/3NF together:** every non-key column should depend on "the key, the whole key, and nothing but the key" — a genuinely useful one-liner to have ready in an interview.

## 5. Denormalization — Breaking the Rules on Purpose, for a Real Reason

```sql
-- Fully normalized: computing an order's total always requires joining and summing order_items
SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = 1;

-- Denormalized: store the computed total directly on the order, updated whenever items change
ALTER TABLE orders ADD COLUMN total DECIMAL(10, 2);
```

A fully normalized schema has zero redundancy, but that means some real, frequently-needed values (an order's total, a post's like count) require a join-and-aggregate on every single read. **Denormalization** deliberately reintroduces redundancy — storing a value directly instead of recomputing it — to trade write complexity (now you must keep `orders.total` in sync whenever `order_items` changes) for read performance (displaying an order list no longer needs to aggregate line items for every row).

The honest engineering rule: normalize by default, because it prevents real data-integrity bugs; denormalize **deliberately and locally**, for a specific column that's read far more often than it changes, with a clear, enforced strategy for keeping it in sync (an application-level update, a database trigger, or an event-driven recalculation) — not as a blanket "normalization is slow, so I'll just duplicate everything" habit.

## Interview Questions and Answers

### 1. What real bug does normalization prevent, in one sentence?

**Answer:** It prevents the same fact from being stored in more than one place, which would otherwise let two copies of that fact silently drift out of sync — an update-anomaly bug where fixing a value in one row leaves a stale, contradictory copy somewhere else.

### 2. What's the practical, one-line summary of 1NF, 2NF, and 3NF together?

**Answer:** Every non-key column should depend on "the key, the whole key, and nothing but the key" — 1NF requires atomic column values, 2NF requires every column to depend on the full composite key (not just part of it), and 3NF requires columns to depend directly on the key rather than transitively through another non-key column.

### 3. Give a concrete example of a 2NF violation and explain why it's specifically a 2NF issue, not a 3NF issue.

**Answer:** In an `order_items` table keyed by `(order_id, product_id)`, storing `order_date` there is a 2NF violation because `order_date` depends on only part of the composite key (`order_id`), not the whole key. It's a 2NF issue specifically because the problem is a *partial* dependency on a composite key — 3NF issues instead involve a non-key column depending on another non-key column rather than the key itself.

### 4. When is denormalization the right engineering decision, and what does it cost?

**Answer:** When a specific value is read far more often than it changes and computing it live (via a join and aggregate) is a measurable performance cost on a hot path — like an order's total shown on every order-list page. The cost is that you now own keeping the duplicated/derived value in sync with its source of truth, which needs a deliberate, enforced mechanism, not just an assumption that it'll stay correct.

### 5. Why is "just normalize everything, always" not universally correct advice?

**Answer:** A fully normalized schema minimizes redundancy and prevents integrity bugs, but it also means frequently-needed derived values require a join-and-aggregate on every read, which can become a real performance bottleneck for read-heavy access patterns. The correct default is to normalize, then denormalize specific, identified hot paths deliberately — not to treat either extreme as universally right.

## Revision Checklist

- [ ] Explain 1NF, 2NF, and 3NF each with a concrete example of the specific bug it prevents.
- [ ] Recite "the key, the whole key, and nothing but the key" and map it to each normal form.
- [ ] Identify whether a given schema violation is a 2NF or 3NF issue, and why.
- [ ] Justify a real denormalization decision (a stored total, a cached count) and name what it costs to maintain.
- [ ] Explain why normalization is the right default but not a universal rule.
