# Isolation Levels and Concurrency Anomalies

Isolation is the ACID letter interviewers dig into the deepest, because it's the one with real, nameable failure modes (dirty reads, non-repeatable reads, phantom reads) and a genuine trade-off — stricter isolation means fewer bugs but more blocked/retried transactions. This guide names each anomaly with a concrete example, then maps it to the isolation level that prevents it.

## 1. The Three Named Anomalies

### Dirty Read — reading another transaction's uncommitted change

```text
T1: UPDATE accounts SET balance = 1000 WHERE id = 1;   -- not committed yet
T2: SELECT balance FROM accounts WHERE id = 1;          -- reads 1000 (T1's uncommitted change!)
T1: ROLLBACK;                                            -- balance reverts to its original value
-- T2 made a decision based on a balance of 1000 that never actually existed
```

T2 read a value that was later rolled back and never really existed from any other observer's point of view — a real, dangerous bug if T2 used that value to approve a purchase or display a balance to a user.

### Non-Repeatable Read — the same row changes value between two reads in the same transaction

```text
T1: SELECT balance FROM accounts WHERE id = 1;   -- reads 500
T2: UPDATE accounts SET balance = 300 WHERE id = 1; COMMIT;
T1: SELECT balance FROM accounts WHERE id = 1;   -- reads 300 — same row, different value, same transaction!
```

T1 read the same row twice within a single logical operation and got two different answers, because another transaction committed a change to that exact row in between — a real problem for any logic that reads a value, does some computation, and reads it again expecting consistency.

### Phantom Read — a query's *result set* changes between two runs in the same transaction

```text
T1: SELECT COUNT(*) FROM orders WHERE status = 'PENDING';   -- returns 5
T2: INSERT INTO orders (status, ...) VALUES ('PENDING', ...); COMMIT;
T1: SELECT COUNT(*) FROM orders WHERE status = 'PENDING';   -- returns 6 — a "phantom" row appeared!
```

This is subtly different from a non-repeatable read: no *existing* row changed — a brand-new row now matches the same `WHERE` clause. A report that runs the same query twice within one transaction and expects a stable answer can be silently wrong.

## 2. The Four Standard Isolation Levels

| Level | Prevents dirty reads? | Prevents non-repeatable reads? | Prevents phantom reads? | Real-world cost |
|---|---|---|---|---|
| **Read Uncommitted** | No | No | No | Fastest, essentially no isolation — rarely used in practice |
| **Read Committed** | Yes | No | No | The default in PostgreSQL and most production systems |
| **Repeatable Read** | Yes | Yes | Usually* | The default in MySQL/InnoDB |
| **Serializable** | Yes | Yes | Yes | Strongest — behaves as if every transaction ran one at a time; highest chance of contention/retries |

\* MySQL's `REPEATABLE READ` uses multi-version concurrency control (MVCC) in a way that also prevents most phantom reads in practice, even though the SQL standard doesn't strictly require it at that level — a real, commonly-quizzed nuance between the standard's guarantee and a specific database's actual implementation.

**The real trade-off, stated honestly:** higher isolation doesn't come free — `SERIALIZABLE` can force transactions to block on each other or abort and retry far more often under real concurrent load, trading throughput for correctness guarantees. Most applications run at `READ COMMITTED` (the practical default) and reach for explicit row locking or a higher isolation level only for the specific operations that genuinely need it — like the money transfer in the [ACID guide](04-ACID-Properties-and-Transactions.md) — rather than raising the isolation level globally for every query in the system.

## 3. Locking as the Practical Tool, Not Just the Isolation Level Setting

```sql
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE; -- locks this row until COMMIT/ROLLBACK
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

`SELECT ... FOR UPDATE` explicitly locks the selected row(s) until the transaction ends, forcing any other transaction trying to read (with `FOR UPDATE`) or write that same row to wait — this is **pessimistic locking**, and it's often the more direct real-world tool for "read a value, then update it based on what you read" than reasoning abstractly about isolation levels. The alternative, **optimistic locking** (a version column checked on update, covered in depth in the [JPA guide](../Springboot/03-Database-JPA-Hibernate.md#7-locking-indexes-and-testing)), avoids holding a lock at all and instead detects a conflict at write time — better when conflicts are rare, since it never blocks a reader waiting on a lock.

## Interview Questions and Answers

### 1. What's the difference between a dirty read and a non-repeatable read?

**Answer:** A dirty read is seeing another transaction's *uncommitted* change, which might later be rolled back and never really existed. A non-repeatable read is reading the *same* row twice within one transaction and getting two different values because another transaction committed a real, permanent change to that row in between the two reads.

### 2. What's a phantom read, and how is it different from a non-repeatable read?

**Answer:** A phantom read is when the *set of rows* matching a query's `WHERE` clause changes between two runs of that query in the same transaction — typically because a new row was inserted (or an existing one deleted) that now matches the condition. A non-repeatable read is about an existing row's value changing; a phantom read is about the result set's membership changing.

### 3. Why does `READ COMMITTED` (a common default) still allow non-repeatable reads?

**Answer:** `READ COMMITTED` only guarantees you never see another transaction's *uncommitted* data — it says nothing about a row changing between two separate reads within your own transaction, as long as each individual read only ever sees committed data. Preventing that requires at least `REPEATABLE READ`, which takes a consistent snapshot for the whole transaction.

### 4. Why doesn't every application just run at `SERIALIZABLE` to be safe?

**Answer:** `SERIALIZABLE` is the strongest isolation level, but enforcing it means transactions must effectively behave as if run one at a time, which increases blocking and forces more transactions to abort and retry under real concurrent load. Most systems use `READ COMMITTED` by default and apply stronger guarantees (a higher isolation level, or explicit locking) only to the specific operations that genuinely need it.

### 5. What's the difference between pessimistic locking (`SELECT ... FOR UPDATE`) and optimistic locking (a version column)?

**Answer:** Pessimistic locking holds an actual database lock on the row for the duration of the transaction, blocking any other transaction that tries to touch it — good for short, highly contended operations. Optimistic locking takes no lock at all, and instead detects a conflict at write time by checking whether a version number changed since it was read — better when conflicts are rare, since readers are never blocked waiting on a lock they don't actually need most of the time.

## Revision Checklist

- [ ] Name and give a concrete example of a dirty read, a non-repeatable read, and a phantom read.
- [ ] Recite the four isolation levels and which anomalies each one prevents.
- [ ] Explain the real trade-off of `SERIALIZABLE` (correctness vs contention/retries) rather than treating it as a free upgrade.
- [ ] Explain when `SELECT ... FOR UPDATE` is the right tool versus relying on the isolation level alone.
- [ ] Choose between pessimistic and optimistic locking for a stated real concurrency scenario.
