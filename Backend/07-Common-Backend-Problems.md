# Common Backend Problems and Reliable Patterns

These patterns are useful because they address failure under retries, concurrency, scale, or partial outages. Always state the invariant first, then explain the mechanism and its trade-offs.

## 1. Caching

Cache-aside is the common starting point:

```java
@Cacheable(cacheNames = "users", key = "#id")
@Transactional(readOnly = true)
public UserResponse findUser(long id) {
    return repository.findById(id).map(mapper::toResponse)
        .orElseThrow(() -> new NotFoundException("User"));
}

@CacheEvict(cacheNames = "users", key = "#id")
@Transactional
public void deleteUser(long id) {
    repository.deleteById(id);
}
```

On a miss, the application reads the database and populates the cache. On a write, invalidate or update the cache after the database operation succeeds. Database and cache writes are not automatically atomic; a crash between them can leave stale data. Use TTLs, versioned values, explicit invalidation, and metrics for hit rate and evictions.

Prevent cache stampedes with request coalescing, jittered TTLs, stale-while-revalidate, or a short distributed lock. A cache must also have an eviction and serialization policy. Never cache private data as publicly shareable, and treat cache availability as part of the failure design.

## 2. Pagination

Offset pagination is easy and supports random page access, but deep offsets can scan and discard many rows. Keyset pagination uses a cursor and a stable indexed order:

```sql
SELECT id, name, created_at
FROM users
WHERE (created_at, id) < (:createdAt, :id)
ORDER BY created_at DESC, id DESC
LIMIT :limit;
```

The tie-breaker `id` makes ordering deterministic. Encode the cursor so clients do not depend on database details, validate a maximum limit, and index the filter plus ordering columns. Search and sort fields must be allowlisted.

## 3. Soft Deletes

Soft delete preserves records but adds filtering and retention complexity:

```java
@Column(nullable = false)
private boolean deleted;
private Instant deletedAt;
```

Use `Instant` or `LocalDateTime` directly; `@Temporal` is not for Java time types. Do not assume one custom repository method filters every query, including inherited methods and native SQL. Options include explicit specifications, Hibernate filters, database views, or a separate archive table. Define whether uniqueness applies to deleted rows and how legal retention or recovery works.

## 4. Idempotency

A check-then-insert is race-prone: two requests can both observe no record. Make the idempotency key unique and claim it atomically in the same transaction as the business effect:

```text
1. Validate request and derive a request hash.
2. Insert key and hash under a unique constraint.
3. If duplicate, compare the hash and return the stored result.
4. Execute the effect in the same transaction.
5. Store status and response for later retries.
```

A reused key with different parameters is a conflict. For effects involving an external provider, combine idempotency with the provider's idempotency mechanism or an outbox workflow; one database transaction cannot roll back a remote charge.

## 5. Retries, Timeouts, and Circuit Breakers

Retry only transient failures, with a bounded attempt count, exponential backoff, and jitter. Set a deadline so retries do not consume the entire request lifetime. Preserve interruption status when handling `InterruptedException`. Never retry a non-idempotent operation unless it has an idempotency key.

A circuit breaker has closed, open, and half-open states. It prevents calls to an unhealthy dependency, but it does not replace timeouts, retries, bulkheads, or a meaningful fallback. Configure it with measured failure rates and expose state metrics. A fallback must not silently return incorrect business data.

## 6. Outbox and Messaging

When a database change must produce an event, writing the row and publishing directly creates a dual-write gap. The transactional outbox pattern writes the business change and an outbox row in one database transaction. A publisher later sends the outbox event and marks it delivered. Consumers must be idempotent because delivery is commonly at-least-once. Failed messages need retry limits and a dead-letter queue with an operator recovery process.

## 7. Money Transfer

The invariant is conservation of value: debit and credit happen together, the amount is positive, and the source has sufficient funds. Use a database transaction, decimal types, authorization checks, idempotency, and a consistent lock order. Use a unique transfer ID and return the original result for a repeated request. For cross-bank or cross-service transfers, use a state machine and reconciliation rather than pretending one local transaction spans all systems.

## Interview Questions and Answers

### 1. Why is cache invalidation difficult?

**Answer:** The database and cache are separate systems with no automatic atomic commit. Failures and concurrent writes can create stale values. Use a clear ownership strategy, TTLs, invalidation or versioning, and metrics; accept and document bounded staleness when appropriate.

### 2. Offset versus keyset pagination?

**Answer:** Offset is simple and supports jumping to a page, but gets slower and unstable for deep changing datasets. Keyset is efficient and stable for next-page navigation, but requires a cursor and compatible ordering.

### 3. How do you make idempotency race-safe?

**Answer:** Use a unique database constraint and an atomic insert or claim operation. Store the request hash and result. A duplicate with the same hash returns the original result; a different payload is rejected.

### 4. When is retrying dangerous?

**Answer:** When the operation is not idempotent, when the failure is permanent, or when retry storms overload the dependency. Use timeouts, backoff, jitter, bounded attempts, and an idempotency mechanism.

### 5. What does a circuit breaker solve?

**Answer:** It fails fast while a dependency is unhealthy and periodically tests recovery. It does not provide correctness by itself and must be paired with timeouts, bulkheads, metrics, and a safe fallback.

### 6. Why use an outbox?

**Answer:** It closes the gap between committing database state and publishing an event by storing both in one local transaction. A separate publisher delivers the event, and consumers handle duplicates.

### 7. How do you prevent cache stampede?

**Answer:** Coordinate concurrent misses, add TTL jitter, serve stale data while refreshing, or temporarily lock population. Bound the refresh work and monitor the cache.

### 8. How do soft deletes affect uniqueness?

**Answer:** A normal unique index may prevent reusing a deleted email. Decide whether deleted records reserve the value, use a database-specific partial unique index, or archive records according to the business rule.

### 9. How would you design a safe transfer endpoint?

**Answer:** Authenticate and authorize the source account, validate a positive decimal amount, require an idempotency key, lock accounts in deterministic order inside a short transaction, enforce sufficient funds, record an audit event, and map repeated or conflicting requests clearly.

### 10. What is at-least-once delivery?

**Answer:** A message is retried until acknowledged, so it may be delivered more than once. Consumers must deduplicate or make processing idempotent; exactly-once business behavior usually requires application-level design.

## Revision Checklist

- [ ] Explain cache-aside consistency and stampede protection.
- [ ] Design stable offset and keyset pagination.
- [ ] Make idempotency safe under concurrent requests.
- [ ] Choose retryable failures and configure timeouts and jitter.
- [ ] Explain circuit breakers, bulkheads, outbox, and dead-letter queues.
- [ ] Design a transfer flow around invariants and failure recovery.
