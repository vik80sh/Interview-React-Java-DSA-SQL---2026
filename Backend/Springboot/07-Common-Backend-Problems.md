# Common Backend Problems and Reliable Patterns (Beginner-Friendly)

This file follows the same approach as [01-Spring-Boot-Fundamentals.md](01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

---

## 1. Caching: Stop Hitting the Database for Data That Barely Changes

**Scenario:** `ProductService.findById` is a simple, correct method:

```java
@Service
public class ProductService {
    private final ProductRepository repository;
    private final ProductMapper mapper;

    public ProductService(ProductRepository repository, ProductMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public ProductResponse findById(long id) {
        return repository.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> new NotFoundException("Product " + id));
    }
}
```

It works fine in testing. Then the product catalog page goes live and gets hit thousands of times a second — mostly for the *same* handful of popular products, whose name, price, and description change maybe once a day. Every single request still round-trips to the database anyway. The database, not your application, becomes the bottleneck, and it's doing pointless repeated work: reading the exact same row over and over.

This is exactly what caching answers: keep a copy of the result somewhere fast (in memory, or in a shared store like Redis), and only go back to the database when that copy is missing or stale.

```java
@Cacheable(cacheNames = "products", key = "#id")
@Transactional(readOnly = true)
public ProductResponse findById(long id) {
    return repository.findById(id)
        .map(mapper::toResponse)
        .orElseThrow(() -> new NotFoundException("Product " + id));
}

@CacheEvict(cacheNames = "products", key = "#id")
@Transactional
public void deleteProduct(long id) {
    repository.deleteById(id);
}
```

Mechanically, this is the same proxy idea covered elsewhere: Spring wraps the bean, and `@Cacheable` checks the cache before your method body ever runs. On a miss, it runs your method, stores the result, and returns it. On a hit, your method body doesn't run at all — the database is never touched.

This is called **cache-aside** — your application code decides when to read from the cache, when to fall through to the database, and when to invalidate. It's the most common caching pattern and the one to reach for by default.

Caching buys speed, but it introduces two new problems that didn't exist before:

**Problem 1 — the cache and the database can disagree.** `@CacheEvict` runs after `deleteProduct`'s database write, but there is no single atomic operation spanning "commit the database" and "update the cache." A crash between the two steps leaves a cache entry pointing at data that no longer matches the database. The practical fix isn't "make it perfectly consistent" — it's bounding *how* stale it can get: a time-to-live (TTL) so entries expire on their own, explicit invalidation on every write path (not just the obvious one), and metrics on hit rate and evictions so staleness is something you can see, not something you discover from a support ticket.

**Problem 2 — a cache stampede.** Say the `products` cache entry for a popular item expires, or the app just restarted with an empty cache. At that exact moment, a thousand concurrent requests for that same product all miss simultaneously and all hit the database at once — which is precisely the load spike caching was supposed to prevent, just concentrated into one instant. The fixes: request coalescing (let one request go to the database while the rest wait for its result instead of duplicating the work), jittered TTLs (so entries for different keys don't all expire at the same millisecond), stale-while-revalidate (serve the slightly-old value while one request refreshes it in the background), or a short-lived distributed lock around the refill.

One more rule worth stating plainly: never cache one user's private data under a key other users' requests can reach — a caching bug that leaks account details across users is a security incident, not a performance bug.

## 2. Pagination: You Can't Return Every Row

**Scenario:** `GET /api/v1/products` returns a plain list, no limits:

```java
@GetMapping
public List<ProductResponse> findAll() {
    return repository.findAll().stream().map(mapper::toResponse).toList();
}
```

Fine with fifty products in a test database. Then the catalog grows to two million rows, and this same endpoint now pulls every row into memory, serializes all of it to JSON, and ties up a database connection for the whole operation — the response takes thirty seconds if it doesn't just run the server out of memory first. This is the same shape of problem as the caching one above: something that's completely fine at small scale becomes a real production incident only once data or traffic crosses some threshold nobody tested against.

The first real fix is **offset pagination** — the client asks for a page number and size, and the server skips ahead:

```text
GET /api/v1/products?page=47&size=20
```

```sql
SELECT id, name, price FROM products
ORDER BY created_at DESC
LIMIT 20 OFFSET 940;
```

This is simple, and it supports something users actually want sometimes — jumping straight to "page 47." But look at what `OFFSET 940` actually costs: the database still has to walk past those 940 rows internally before it can hand you the next 20, even though you never see them. At offset 50,000 that walk is real, measurable work, repeated on every request. Worse, if rows are being inserted while someone pages through, a row can shift from page 3 to page 4 between requests — the same row appears twice, or a different row silently disappears from the results the user never sees.

The fix for both problems is **keyset pagination**: instead of "skip N rows," the client sends a cursor — the actual value of the last row it saw — and the query asks for "whatever comes next after this exact point":

```sql
SELECT id, name, created_at
FROM products
WHERE (created_at, id) < (:createdAt, :id)
ORDER BY created_at DESC, id DESC
LIMIT :limit;
```

The `id` tie-breaker matters: two products can share the exact same `created_at`, and without a second column the ordering isn't deterministic, which means the same row really can get skipped or repeated. This stays fast no matter how deep you page, because there's no rows-to-skip step — the index takes you straight to the right point. The trade-off is you lose "jump to page 47" — you can only move forward or backward from wherever the cursor points.

A few things apply regardless of which one you pick: clamp the page size the client can request (an unbounded `size=1000000` is a client accidentally — or deliberately — running a denial-of-service against your own database), encode the cursor so clients don't depend on your database's internal representation, and allowlist which fields can be used for sorting or filtering — letting a client sort by an arbitrary column name is a good way to leak schema details or open an injection-style attack. Use offset pagination when users genuinely need direct random page access on a dataset that stays modest in size (an admin table with a few thousand rows); use keyset pagination for anything large or frequently changing (a public catalog, an activity feed).

## 3. Soft Deletes: Deleting a Row Without Actually Deleting It

**Scenario:** `DELETE /api/v1/users/42` runs `repository.deleteById(42)` and the row is gone. Then two things happen in the following weeks: support asks "can you pull up the order history for the account that just got closed," and separately, a user emails asking to undo an accidental account deletion from yesterday. In both cases the honest answer is "no, the row is physically gone, there's nothing left to look at" — and depending on your business, that might also violate a legal or audit retention requirement.

The fix is to never actually run `DELETE` for this kind of record. Instead, mark it as gone and keep it:

```java
@Column(nullable = false)
private boolean deleted;

private Instant deletedAt;
```

Use `Instant` (or `LocalDateTime`) directly for the timestamp — `@Temporal` is a JPA annotation for the old `java.util.Date`/`Calendar` types, not for `java.time` types, and putting it on an `Instant` field is a common but harmless-looking mistake worth not making.

Here's the real gotcha with soft deletes, and it's easy to walk into: you add a `findAllByDeletedFalse()` method and think you're done. But every *other* query path — `findAll()`, a custom `@Query` with raw JPQL, a native SQL query, an inherited repository method you didn't write yourself — has no idea a `deleted` column even exists. Fix the one endpoint you tested, and three other endpoints keep quietly returning "deleted" users, which shows up later as a confusing bug report ("why is this closed account still showing up in search?") rather than an obvious crash. The real fix has to apply the filter everywhere, not method-by-method: a Spring Data `Specification` applied consistently, a Hibernate `@Filter` enabled globally, a database view that already excludes deleted rows, or moving deleted records to a separate archive table entirely so the main table simply can't return them.

Soft deletes also break an assumption you probably didn't know you were relying on: a unique constraint on `email` doesn't know the difference between an active row and a soft-deleted one. A user account soft-deleted with `ana@example.com` still occupies that value in a normal unique index, so a brand-new signup using the same email fails with a constraint violation — even though, from the business's point of view, that email should be free to reuse. The options are a database-specific partial unique index (unique only where `deleted = false`), a business decision to permanently reserve the value, or physically archiving the row (removing it from the active table, constraint and all) after some retention period has passed.

## 4. Idempotency: Handling the Retry You Didn't Ask For

**Scenario:** a client calls `POST /api/v1/orders` to place an order. The order is created successfully on the server, but the response never makes it back — the connection drops. The client has no idea whether the order went through, so it does the only reasonable thing: retries the exact same `POST`. Now there are two order rows for one purchase.

The instinctive fix is to check first, then insert:

```java
if (!repository.existsByRequestId(requestId)) {
    repository.save(order);   // both requests can reach this line before either commits
}
```

This looks safe, but it's a race condition: two identical requests, arriving close enough together, can both run `existsByRequestId` and both see "no, it doesn't exist yet" — because neither has committed — and both proceed to insert. The check and the insert aren't one atomic operation, so the gap between them is exactly where the duplicate sneaks in.

The actual fix is to make the *key* itself the enforcement mechanism, not application logic that reads-then-writes:

```text
1. Client generates a unique idempotency key for this specific attempt (not per-retry — the same key on every retry of the same logical request).
2. Server derives a hash of the request body and tries to atomically insert (idempotency key, request hash) under a unique database constraint, in the same transaction as the actual business effect (creating the order).
3. If the insert succeeds, the order is created and the key is now claimed.
4. If the insert fails because the key already exists, compare the stored hash: same hash means "this is a retry of the same request" — return the originally stored result, don't create anything new. A different hash means the client reused a key for a different request — that's a conflict, reject it.
```

The unique constraint is what actually closes the race: the database itself refuses a second concurrent insert with the same key, no matter how close together the two requests arrive — there's no gap for both to slip through, unlike the check-then-insert version above.

One case idempotency alone can't fully cover: an operation that reaches out to an external system, like actually charging a card through a payment provider. Your own database transaction can commit or roll back, but it has no power to un-charge a card that already got charged on the provider's side. The realistic fix combines your idempotency key with the provider's *own* idempotency mechanism (most payment APIs accept one), or defers the external call to a separate, reliable delivery step — which is exactly the problem the outbox pattern in section 6 exists to solve.

## 5. Retries, Timeouts, and Circuit Breakers: When a Downstream Service Is Flaky or Down

**Scenario:** `OrderService` calls out to a payment gateway over HTTP:

```java
PaymentResult result = paymentGatewayClient.charge(orderId, amount);
```

Most of the time this is fine. Then the gateway has a bad five minutes — some calls hang, some time out, some fail outright. A naive response is to retry immediately in a tight loop until something works. Two things go wrong with that: if the outage is real rather than a one-off blip, thousands of client instances retrying at once pile even more load onto a dependency that's already struggling — a **retry storm** that turns a partial outage into a total one. And if `charge()` genuinely succeeded on the gateway's side but the *response* was what got lost, blindly retrying charges the customer a second time — you cannot safely retry a non-idempotent operation without the idempotency-key protection from section 4.

The pieces that make retrying safe: a **timeout** so a single call has a hard deadline instead of hanging indefinitely; **bounded retry attempts** with **exponential backoff and jitter** (wait longer between each attempt, and randomize the wait slightly so many clients don't all retry in lockstep); retrying only *transient* failures (a timeout, a 503) and never a failure that's clearly permanent (a 400 saying the card number is invalid isn't going to succeed on attempt two); and, if you're catching `InterruptedException` anywhere in this flow, re-setting the thread's interrupt status instead of swallowing it, so the rest of the system still knows a shutdown or cancellation was requested.

That handles a *flaky* dependency. Now consider a dependency that's fully down for a sustained period, not just occasionally slow. Every request that calls it still has to wait out its full timeout before failing — which means threads pile up waiting on a dependency that was never going to respond, the thread pool serving those requests gets exhausted, and now requests that have *nothing to do* with payments start failing too, because there are no threads left to handle them. A slow dependency has just taken down the whole application — this is a **cascading failure**.

The fix is a **circuit breaker**, which tracks recent failure rate and moves through three states: **closed** (normal — calls go through as usual), **open** (after failures cross a threshold, stop even trying — fail immediately, with no network call at all, protecting both your own threads and the already-struggling dependency), and **half-open** (after a cool-down, let a small number of calls through as a test; if they succeed, go back to closed, if they fail, go back to open). This is what actually stops the pile-up: once the breaker is open, a request fails in microseconds instead of waiting out a full timeout, so the thread pool never gets exhausted in the first place.

A circuit breaker is not, by itself, a complete answer — it needs to sit alongside the timeouts and retries above, and it needs a fallback that's actually meaningful. Returning a cached "everything's fine" or fabricating a default business answer (like assuming a fraud check would have passed, when the fraud check service is what's actually down) is worse than an honest error — it's confidently wrong instead of visibly broken. A related, complementary idea is the **bulkhead**: giving each downstream dependency its own separate pool of threads or connections, so a struggling payment gateway can exhaust *its own* pool without starving the threads that talk to, say, the completely unrelated shipping-label service.

## 6. Outbox and Messaging: Keeping a Database Write and an Event in Sync

**Scenario:** placing an order should also notify the shipping system, so `OrderService` does the obvious thing right after saving:

```java
@Transactional
public OrderResponse placeOrder(CreateOrderRequest request) {
    Order order = repository.save(toEntity(request));
    messagingClient.publish("OrderPlaced", toEvent(order));   // outside the database transaction
    return mapper.toResponse(order);
}
```

Walk through what can go wrong. If the application crashes — or the network to the message broker drops — *after* the database commit but *before* `publish` succeeds, the order exists but shipping is never told about it: a silent gap that's easy to miss because nothing throws an exception the user sees. Flip the order and publish first, and you get the opposite bug: you've told the shipping system an order exists, and then the database save fails — now you've announced something that was never actually created. The root problem is that the database and the message broker are two entirely separate systems; there's no single transaction that spans both, so "always both, or neither" isn't something either system alone can guarantee. This is called the **dual-write problem**.

The fix is the **transactional outbox** pattern: instead of publishing directly, write the order *and* a row describing the event into the *same* database transaction:

```java
@Transactional
public OrderResponse placeOrder(CreateOrderRequest request) {
    Order order = repository.save(toEntity(request));
    outboxRepository.save(new OutboxEvent("OrderPlaced", toEvent(order)));  // same transaction, same commit
    return mapper.toResponse(order);
}
```

Both rows commit together or neither does — there's no window where one exists without the other, because it's one ordinary database transaction, not two separate systems that each need to succeed independently. A separate publisher process then polls the outbox table (or reads its change stream) and sends each event to the message broker, marking it delivered once the broker acknowledges it.

This introduces one more thing to design for: message brokers typically guarantee **at-least-once delivery** — a message will eventually arrive, but it might arrive more than once (say, the publisher sends it, the broker receives it, but the "mark as delivered" step never completes before a crash — on restart, the still-unmarked event gets sent again). That means the shipping system's consumer has to be **idempotent** — the same underlying idea as section 4's idempotency key, just applied on the receiving side of a message instead of an HTTP request. And messages that keep failing to process after repeated attempts shouldn't retry forever or vanish silently — route them to a **dead-letter queue (DLQ)** after a bounded number of attempts, so a human can investigate instead of the failure disappearing into logs nobody's watching.

## 7. Money Transfer: Getting a Multi-Step Write Actually Right

**Scenario:** `AccountService.transfer(fromAccountId, toAccountId, amount)` needs to move money from one account to another. This single method has more ways to go wrong than almost anything else in this file, so it's worth walking through each failure mode before looking at the fix.

**The core rule, before any code:** the total amount of money in the system must stay exactly the same — a transfer only moves value, it never creates or destroys it. This is the **invariant** everything below has to protect: debit and credit happen together, the amount is strictly positive, and the source account actually has sufficient funds.

Now the concrete ways a naive implementation breaks that invariant:

1. **Partial failure.** Debit the source account, then the application crashes before the credit runs. The money has vanished from the system — it left one account and arrived nowhere.
2. **Deadlock.** Two transfers happen concurrently in opposite directions — one from account 1 to account 2, another from account 2 to account 1 — and each one locks its own "from" account first. Thread A holds a lock on account 1 and waits for account 2; thread B holds a lock on account 2 and waits for account 1. Neither can proceed. This is a **deadlock**, and it's a direct consequence of each transfer choosing its lock order independently based on direction.
3. **Duplicate transfer.** A client's request times out, it doesn't know whether the transfer happened, and it retries — the same problem as section 4, now with real money attached.
4. **Using `double` for money.** Floating-point arithmetic doesn't represent most decimal fractions exactly, so repeated additions and subtractions on `double` amounts silently drift — fractions of a cent appear or disappear over enough transactions.

Each fix maps directly onto one of those:

- **One database transaction wrapping both the debit and the credit.** A crash partway through rolls back everything that happened inside it — there's no state where the money left one account without arriving in the other.
- **A single, deterministic lock order, independent of transfer direction** — for example, always lock the account with the lower ID first, regardless of whether it's the source or destination. Both concurrent transfers above now try to lock account 1 first, so one simply waits for the other to finish instead of the two deadlocking each other.
- **An idempotency key on the transfer request**, exactly as in section 4 — a unique constraint claimed atomically in the same transaction as the actual debit/credit, so a retried request returns the original result instead of moving money twice.
- **A decimal type built for exact arithmetic** — `BigDecimal` in Java, mapped to a fixed-precision decimal column in the database — never `float` or `double` for a monetary amount.
- **Authorization and sufficient-funds checks inside the same transaction**, not as a separate earlier step that could go stale between checking and acting.

One case this doesn't fully solve: a transfer between two different banks, or two services that each own their own database. There is no single transaction that can span systems you don't control the internals of. The realistic approach there is a **state machine** — `pending → debited → credited → completed`, with an explicit `compensating` or `failed` path when a step doesn't complete — paired with a reconciliation process that periodically checks both sides for mismatches and repairs them, rather than pretending one local `@Transactional` method can guarantee atomicity across systems it has no control over.

## Interview Questions and Answers

### 1. Why is cache invalidation genuinely difficult?

**Answer:** The database and the cache are two separate systems with no shared atomic commit between them. A crash or a concurrent write between the database update and the cache update can leave a stale cached value with nothing to signal it's stale. The realistic mitigation is a clear invalidation strategy on every write path, a TTL as a backstop, and metrics on hit rate and staleness — not chasing perfect consistency.

### 2. What causes a cache stampede, and how do you prevent one?

**Answer:** A popular cache entry expiring (or a cold restart with an empty cache) causes many concurrent requests to miss at the same instant, all of which hit the database simultaneously — recreating the load spike caching was meant to prevent. Prevent it with request coalescing, jittered TTLs so entries don't expire in lockstep, stale-while-revalidate, or a short-lived lock around the refill.

### 3. Offset versus keyset pagination — when does each make sense?

**Answer:** Offset pagination is simple and supports jumping directly to an arbitrary page, but deep pages force the database to scan and discard everything before them, and results can shift under concurrent inserts. Keyset pagination uses a cursor and a deterministic, uniquely-ordered sort to fetch "whatever comes next," staying fast at any depth and stable under concurrent writes, at the cost of losing random page access. Use offset for small, relatively static datasets where users need to jump to a specific page; use keyset for anything large or frequently changing.

### 4. Why do soft deletes complicate a unique constraint?

**Answer:** A normal unique index doesn't distinguish an active row from a soft-deleted one, so a soft-deleted user's email still blocks a new signup that reuses it. The fix is a database-specific partial unique index scoped to non-deleted rows, a business decision to permanently reserve the value, or physically archiving the row once a retention period passes.

**Follow-up:** Why isn't one custom repository method enough to hide deleted rows everywhere? Because every other query path — `findAll()`, native SQL, raw JPQL, inherited methods — has no idea the `deleted` column exists unless the filter is applied globally (a `Specification`, a Hibernate `@Filter`, a view, or a separate archive table), not endpoint by endpoint.

### 5. How do you make idempotency actually race-safe, not just "check first"?

**Answer:** A check-then-insert has a gap where two concurrent identical requests can both pass the check before either commits, producing two rows anyway. The fix is a unique database constraint on the idempotency key, claimed with an atomic insert in the same transaction as the business effect. A retried request with the same key and same request hash returns the stored result; a different hash under the same key is rejected as a conflict.

### 6. When is retrying a failed call actually dangerous?

**Answer:** When the operation isn't idempotent and could double-execute (charging a customer twice), when the failure is permanent rather than transient (retrying a validation error accomplishes nothing), or when many clients retrying at once turns a partial outage into a full one (a retry storm). Safe retries need bounded attempts, exponential backoff with jitter, a deadline, and — for non-idempotent operations — an idempotency key.

### 7. What does a circuit breaker solve that a timeout alone doesn't?

**Answer:** A timeout still makes every caller wait out the full deadline before failing, which under a sustained outage exhausts the thread pool and turns one dependency's failure into a cascading failure across the whole app. A circuit breaker tracks failure rate and, once open, fails calls immediately with no network attempt at all — protecting the thread pool — then periodically tests recovery via a half-open state. It has to be paired with timeouts, retries, bulkheads, and a fallback that doesn't fabricate an incorrect business answer.

### 8. What's a bulkhead, and why does it matter alongside a circuit breaker?

**Answer:** It's isolating the thread or connection pool used for one dependency from the pools used for others, so a struggling dependency can exhaust only its own resources instead of starving requests that have nothing to do with it. A circuit breaker stops calls to the failing dependency; a bulkhead limits the damage while it's still failing.

### 9. What problem does the transactional outbox pattern actually fix?

**Answer:** Writing a database row and publishing a message as two separate steps creates a dual-write problem — a crash between the two leaves the database and the message broker disagreeing about what happened, with no shared transaction to prevent it. The outbox pattern writes the business row and an outbox row describing the event in one database transaction, so they always commit together; a separate publisher then delivers the outbox row and marks it sent.

### 10. What is at-least-once delivery, and what does it require from a consumer?

**Answer:** A messaging guarantee that a message will eventually be delivered, but possibly more than once (for example, if a publisher crashes after sending but before recording it as sent). Consumers have to be idempotent — able to safely process the same message twice without a duplicate side effect — because exactly-once delivery at the message-broker level generally isn't available; exactly-once *business* behavior has to be built at the application level.

### 11. Walk through what makes a money-transfer endpoint safe.

**Answer:** Wrap the debit and credit in one database transaction so a crash partway through rolls back both, not one. Use a decimal type built for exact arithmetic (never `double`), require an idempotency key so a retried request doesn't move money twice, check authorization and sufficient funds inside that same transaction, and lock both accounts in one deterministic order (such as by ascending account ID) regardless of transfer direction.

### 12. Why does locking accounts in a fixed order prevent the deadlock, specifically?

**Answer:** If each transfer locks its own "from" account first, two transfers running in opposite directions can each hold the lock the other one needs, and neither can proceed. Locking by a fixed, direction-independent rule (say, always the lower account ID first) means both transfers attempt to acquire the same first lock, so one simply waits for the other to finish instead of the two waiting on each other forever.

## Revision Checklist

- [ ] Explain, using `ProductService.findById`, why cache-aside helps and what the cache-and-database consistency gap actually is.
- [ ] Explain a cache stampede and name at least two ways to prevent one.
- [ ] Compare offset and keyset pagination and say when each is the right choice.
- [ ] Explain why a soft-delete flag needs a global filtering strategy, not a single repository method, and how it breaks a unique constraint.
- [ ] Design an idempotency mechanism that's actually race-safe under concurrent retries, not just "check then insert."
- [ ] Explain when retrying is safe versus dangerous, and what backoff, jitter, and a deadline each contribute.
- [ ] Explain the three circuit breaker states, why they prevent a cascading failure, and how a bulkhead complements one.
- [ ] Explain the dual-write problem and how the transactional outbox pattern closes it.
- [ ] Explain at-least-once delivery and why it forces consumers to be idempotent.
- [ ] Design a money-transfer flow around the conservation-of-value invariant, covering partial failure, deadlock, duplicate requests, and decimal precision.
