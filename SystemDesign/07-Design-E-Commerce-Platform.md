# Design an E-Commerce Platform (Amazon/Flipkart-style)

Same [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). E-commerce's hard problem isn't the catalog browsing (that's a standard read-heavy caching problem) — it's checkout: making sure two customers can't both buy the last unit of a sold-out item, and making sure a payment that succeeds is never lost or double-charged, all while the catalog itself needs to be fast and SEO-visible to actually drive traffic in the first place.

## 1. Clarify Requirements

**Functional:** browse/search a catalog, add to cart, checkout (address, payment), track order status, view order history.

**Non-functional:** What's the read/write ratio? (Very read-heavy — browsing vastly outnumbers purchasing.) Can the system ever oversell a product? (No — this single answer is what makes the inventory deep dive the actual point of the interview.) Does checkout need to be public-page-fast or just correct? (Both — cart abandonment is directly tied to checkout latency, so this isn't purely a correctness problem.)

## 2. Estimate Scale

- 50M monthly active users, ~2M DAU (Daily Active Users — unique users opening the app on a given day), browsing heavily (a typical session views 10-20 product pages) but converting to a purchase far less often (~2-5% conversion).
- Read QPS (Queries Per Second — requests the system must handle every second): 2M × 15 page views / 86,400 ≈ 350 QPS average for catalog browsing, spiking far higher during a flash sale.
- Write QPS: 2M × 3% conversion / 86,400 ≈ 700 orders/day → under 1 QPS average for order creation — tiny compared to browsing, but each one is far more consistency-sensitive than a page view.
- **Flash sale spike:** the realistic worst case isn't average load — it's 100,000 users all trying to buy the same 500-unit product within a two-minute window when a sale starts. This specific scenario is what actually stresses the inventory deep dive below, not steady-state traffic.

## 3. Core API and Data Model

```text
GET  /products/search?q=          → [{product_id, name, price, thumbnail, inStock}]
POST /cart/items                    {product_id, quantity}     → cart
POST /checkout                      {cartId, address, payment} → order_id, status
GET  /orders/{id}                                              → order status
```

```sql
products(product_id PK, name, price, description, category)
inventory(product_id PK, available_quantity, version)   -- version column: optimistic locking
orders(order_id PK, user_id, status, total, created_at)
order_items(order_id FK, product_id FK, quantity, unit_price)
```

The `version` column on `inventory` is deliberate — it's exactly the optimistic-locking mechanism from the [Isolation Levels guide](../Backend/Database/05-Isolation-Levels-and-Concurrency-Anomalies.md#3-locking-as-the-practical-tool-not-just-the-isolation-level-setting), and it's the single most important schema decision in this whole design.

## 4. High-Level Architecture

```text
User → CDN (Content Delivery Network — caches product images close to the user; see file 02) → Load Balancer → Web/API servers → Cache (Redis: catalog, cart)
                                                       │
                                                       ├─→ Search (Elasticsearch, product catalog index)
                                                       ├─→ Order Service → Payment Gateway (Stripe/etc.) → Order DB
                                                       └─→ Message Queue → Inventory reservation / notification workers
```

Catalog browsing (read-heavy, cacheable, tolerant of a little staleness) and checkout (low-volume, correctness-critical) are architecturally different workloads sharing the same product data — this split is worth stating explicitly, since it justifies caching the catalog aggressively while never caching inventory counts the same way.

## 5. Deep Dive 1: Preventing Overselling During a Flash Sale

The naive approach — read the current stock count, check if it's enough, then decrement it — is a textbook race condition under concurrency: two requests can both read "1 unit left" before either writes back, and both proceed to sell that same last unit.

```sql
-- WRONG under concurrency: read-then-write, race-prone
SELECT available_quantity FROM inventory WHERE product_id = 42;
-- (application checks: is available_quantity >= requested_quantity?)
UPDATE inventory SET available_quantity = available_quantity - 1 WHERE product_id = 42;

-- RIGHT: an atomic conditional decrement — the check and the write happen as one operation
UPDATE inventory
SET available_quantity = available_quantity - 1
WHERE product_id = 42 AND available_quantity >= 1;
-- if this updates 0 rows, the item was already sold out — the database itself enforced it
```

This single-statement conditional update is the real fix — the database's own row-level locking makes the check-and-decrement atomic, so two concurrent requests can never both succeed against the same last unit; whichever one commits first wins, and the other's `UPDATE` affects zero rows and is treated as "sold out." This is directly the same principle as the [ACID isolation guide's lost-update example](../Backend/Database/04-ACID-Properties-and-Transactions.md#i--isolation-concurrent-transactions-shouldnt-see-each-others-half-finished-work) — this system's entire correctness story rests on that one SQL statement's atomicity.

**For the flash-sale spike specifically:** 100,000 concurrent requests hitting the same row still means 100,000 requests serialized against one row's lock, which becomes its own bottleneck even with correct atomicity. The real production fix is pre-reserving inventory into a fast, single-purpose counter (a Redis `DECR`, atomic and far higher-throughput than a relational row lock) for the hot flash-sale window specifically, with the relational database as the durable source of truth reconciled shortly after — trading a small window of eventual consistency for surviving the spike at all.

## 6. Deep Dive 2: The Checkout Flow — Payment, Inventory, and Order as One Logical Operation

Checkout touches three things that must all succeed together: reserving inventory, charging payment, and creating the order record — and they can't be one database transaction, because the payment gateway is an external system with its own separate commit.

```text
1. Reserve inventory (the atomic conditional UPDATE above) — holds the stock for this order
2. Charge payment via the gateway, using the order ID as an idempotency key
   (a network retry of this exact request must not double-charge — see the
   idempotency pattern in the Common Backend Problems guide)
3. On payment success: mark the order CONFIRMED
   On payment failure: release the reserved inventory back, mark the order FAILED
4. Publish an order-confirmed event (via the outbox pattern) for downstream systems
   (shipping, notifications) rather than calling them synchronously inline
```

This is a **saga** — a sequence of local steps, each with a defined compensating action if a later step fails (releasing inventory if payment fails is the compensation for step 1), rather than one atomic cross-system transaction, because no such transaction can exist across an external payment gateway. The [outbox pattern](../Backend/Springboot/07-Common-Backend-Problems.md#6-outbox-and-messaging) is what makes step 4 reliable without a dual-write race between "commit the order" and "publish the event."

## 7. Frontend Perspective

- **Rendering strategy — this is where e-commerce differs most from the other scenario files:** product listing and detail pages are prime SSR/SSG candidates, not CSR, because they need to be indexed by search engines and load fast for anonymous, not-yet-logged-in visitors who are the actual source of organic traffic. The cart and checkout flow, by contrast, are authenticated and per-user, so CSR is the right call there. This SEO-driven split is the single most e-commerce-specific frontend decision in this whole file.
- **Search-as-you-type:** debounced input hitting the Elasticsearch-backed search endpoint, with `AbortController` cancelling a stale in-flight request when the user keeps typing — the exact pattern from the [Debounce/Throttle guide](../Frontend/JavaScript/08-Debounce-Throttle-and-Error-Handling.md).
- **Cart state:** persisted both client-side (so it survives a refresh before login) and synced server-side once authenticated — a real merge-conflict case worth mentioning: what happens to a guest cart when that user logs in and already has a different server-side cart.
- **Checkout must never be purely optimistic:** unlike a "like" button, a payment cannot be shown as succeeded before the server actually confirms it — show a clear pending/processing state instead, and design for the payment gateway's confirmation being asynchronous (a redirect-based flow, or a webhook-driven status update) rather than assuming a single synchronous response.
- **Image-heavy catalog performance:** `srcset`/`sizes` for responsive product images and lazy-loading below the fold, exactly the pattern in the [Responsive Design guide](../Frontend/HTML-CSS/05-Responsive-Design-and-Media-Queries.md#6-responsive-images--not-just-max-width-100) — a product grid is one of the most image-bandwidth-heavy real page types.

## 8. Bottlenecks and Trade-offs

- **The inventory row lock under flash-sale load** — mitigated by moving the hot-path reservation into Redis, with the relational database as the reconciled source of truth, trading brief eventual consistency for surviving the spike.
- **Search index staleness** — Elasticsearch is updated asynchronously from the primary catalog write path, so a just-updated price or stock status can lag by seconds in search results; acceptable for browsing, never acceptable for the actual checkout decrement, which always hits the real inventory table.
- **Payment gateway as an external dependency** — a timeout or slow response from the third-party processor must not leave inventory reserved indefinitely; a reservation needs a expiry/timeout that releases it back if checkout never completes.

## 9. Trade-off Summary

This design keeps the checkout path **strictly consistent** (atomic inventory decrements, idempotent payment, a saga with explicit compensation) while keeping the catalog/browsing path **eventually consistent and heavily cached** — because overselling or double-charging is a real, costly failure, while a product page showing a price that's a few seconds stale is not, and conflating the two paths' consistency needs into one uniform design would either make browsing too slow or checkout too risky.

## Interview Questions and Answers

### 1. Why does a read-then-write stock check fail under concurrency, and what's the actual fix?

**Answer:** Two concurrent requests can both read the same "in stock" count before either writes back their decrement, so both proceed and both succeed against what was actually the last unit — a classic lost update. The fix is a single atomic conditional `UPDATE ... WHERE available_quantity >= requested_quantity`, which makes the check and the decrement one indivisible database operation, so only one of two concurrent requests against the last unit can ever actually succeed.

### 2. Why can't checkout be one single database transaction covering inventory, payment, and the order record?

**Answer:** The payment gateway is an external system with its own separate commit boundary — there's no cross-system transaction that can atomically span your database and a third-party payment processor. The checkout flow is instead a saga: a sequence of local steps, each with an explicit compensating action (releasing reserved inventory) if a later step fails.

### 3. Why would a flash sale need Redis-based inventory reservation instead of just relying on the database's row lock?

**Answer:** The atomic conditional update is correct even under massive concurrency, but correctness doesn't mean high throughput — 100,000 concurrent requests against one row still serialize against that row's lock. Moving the hot-path decrement into a fast in-memory counter (Redis `DECR`) handles far higher throughput, with the relational database reconciled as the durable source of truth shortly after, at the cost of a brief window of eventual consistency.

### 4. Why should product listing pages be server-rendered while the checkout flow is client-rendered?

**Answer:** Product pages need to be indexed by search engines and load fast for anonymous visitors who are the actual source of organic traffic — that's a strong argument for SSR/SSG. Checkout is authenticated, highly interactive, and has no SEO value at all, so CSR fits it better; using one rendering strategy for the whole site would either hurt SEO or add unnecessary server rendering cost to a page that gains nothing from it.

### 5. Why must a payment charge use an idempotency key, and what should it be?

**Answer:** A network retry of the same checkout request (the client didn't get a confirmed response and tries again) must not charge the customer a second time for the same order. Using the order ID itself as the idempotency key, checked against the payment gateway or a local unique constraint before charging, ensures a duplicate request returns the original result instead of a second charge.

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It keeps checkout strictly consistent (atomic inventory, idempotent payment, an explicit saga with compensation) while keeping catalog browsing eventually consistent and heavily cached, because the cost of getting each of those two paths wrong is completely different — overselling or double-charging is a real financial and trust problem, while a briefly stale product price is not.

## Revision Checklist

- [ ] Walk through all 8 template steps for an e-commerce checkout flow unprompted.
- [ ] Explain the read-then-write inventory race condition and the atomic conditional-update fix.
- [ ] Explain why checkout is a saga rather than one cross-system transaction, and name the compensating action.
- [ ] Explain the Redis-reservation fix for a flash-sale spike and what consistency it trades away.
- [ ] Justify the SSR-for-catalog, CSR-for-checkout rendering split by SEO and authentication needs.
- [ ] Design an idempotent payment flow and explain why the order ID is a natural idempotency key.
- [ ] State this design's core trade-off in one clear sentence.
