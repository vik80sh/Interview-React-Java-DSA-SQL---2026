# ACID Properties and Transactions

Everyone can recite "Atomicity, Consistency, Isolation, Durability" — the interview actually worth passing is explaining what specifically breaks in a real money-transfer or checkout flow when any one of the four is missing, and connecting each letter to a real database mechanism, not just a definition.

## The Running Example: Transferring Money Between Two Accounts

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1; -- debit Ana
UPDATE accounts SET balance = balance + 100 WHERE id = 2; -- credit Ben
COMMIT;
```

Every ACID property below is explained in terms of what goes wrong with this exact transfer if that property didn't hold.

## A — Atomicity: All or Nothing

**Without atomicity:** the server crashes after the debit but before the credit. Ana has lost $100, and it went nowhere — it simply vanished from the system. This is a real, catastrophic bug class: partial application of a multi-step operation.

**With atomicity:** the two `UPDATE`s are wrapped in a single transaction (`BEGIN`...`COMMIT`), and the database guarantees that either **both** statements apply or **neither** does. If the crash happens before `COMMIT`, the database's recovery process rolls the transaction back entirely on restart — Ana's debit never happened, from the perspective of anyone else looking at the data. Atomicity is what a `ROLLBACK` and crash recovery are actually for.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- something goes wrong here — insufficient funds detected, external validation fails, etc.
ROLLBACK; -- the debit above is completely undone, as if it never ran
```

## C — Consistency: Never Leave the Data in a State That Violates Its Own Rules

**Without consistency:** a transaction could leave `balance` negative when the schema/business rule says it never should, or leave an order's total not matching the sum of its line items.

**With consistency:** the database enforces constraints (`CHECK (balance >= 0)`, foreign keys, `NOT NULL`, `UNIQUE`) so a transaction that would violate them is rejected outright rather than allowed to commit a broken state:

```sql
ALTER TABLE accounts ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

BEGIN;
UPDATE accounts SET balance = balance - 1000000 WHERE id = 1; -- would make balance negative
COMMIT; -- rejected: violates balance_non_negative — the whole transaction rolls back
```

This is the property most people get vague about in interviews because, unlike the other three, "consistency" here means the database enforcing **your own declared rules**, not some abstract universal correctness — the database doesn't know your business logic unless you tell it via constraints, foreign keys, and correctly-scoped transactions.

## I — Isolation: Concurrent Transactions Shouldn't See Each Other's Half-Finished Work

**Without isolation:** two transfers running at the same time could each read Ana's balance before the other's write lands, both compute a new balance from the same stale starting point, and one update overwrites the other — a classic **lost update**.

```text
Transaction 1: reads balance = 500
Transaction 2: reads balance = 500          (before T1 commits)
Transaction 1: writes balance = 500 - 100 = 400, commits
Transaction 2: writes balance = 500 - 50  = 450, commits   <- overwrites T1's debit entirely!
```

**With proper isolation** (an appropriate isolation level, or explicit row locking), the database prevents this — either by making Transaction 2 wait for Transaction 1's lock to release before reading, or by detecting the conflict and forcing one transaction to retry. Isolation levels are exactly the tunable knob for how strictly this is enforced, covered in the [Isolation Levels guide](05-Isolation-Levels-and-Concurrency-Anomalies.md).

## D — Durability: Once Committed, It Survives a Crash

**Without durability:** the server confirms the transfer succeeded, the client shows "Transfer complete," and then the machine loses power before the change was actually written to disk — the money transfer the user was told succeeded is simply gone.

**With durability:** once `COMMIT` returns successfully, the database guarantees the change survives a crash immediately afterward — typically via a **write-ahead log (WAL)**, where the change is durably written to an append-only log *before* the commit is acknowledged, so recovery can replay the log and reconstruct the change even if the actual data files hadn't been fully updated on disk yet.

## Where ACID Actually Lives in a Real Spring Boot Application

```java
@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    Account from = accountRepository.findById(fromId).orElseThrow();
    Account to = accountRepository.findById(toId).orElseThrow();

    if (from.getBalance().compareTo(amount) < 0) {
        throw new InsufficientFundsException(fromId); // exception -> Spring rolls back the whole method
    }
    from.debit(amount);
    to.credit(amount);
    // both saves commit together when the method returns, or neither does if anything above threw
}
```

`@Transactional` is the application-level trigger for the database's `BEGIN`/`COMMIT`/`ROLLBACK` machinery — this is the exact mechanism discussed in the [Spring Boot Fundamentals guide](../Springboot/01-Spring-Boot-Fundamentals.md#7-lifecycle-and-transactions) and the [JPA/Hibernate guide](../Springboot/03-Database-JPA-Hibernate.md#5-transactions-and-isolation): an unchecked exception thrown anywhere inside the method causes the whole transaction to roll back, giving you atomicity for free at the application layer without writing `BEGIN`/`ROLLBACK` by hand.

## Interview Questions and Answers

### 1. Recite ACID and explain, for each letter, what specifically breaks in a money transfer without it.

**Answer:** Without atomicity, a crash mid-transfer can debit one account and never credit the other, losing money outright. Without consistency, a transaction could leave a balance negative or an order total mismatched with its line items, violating the data's own rules. Without isolation, two concurrent transfers can both read a stale balance and one update silently overwrites the other (a lost update). Without durability, a transaction the user was told succeeded could vanish if the server crashes right after commit, before the change was durably persisted.

### 2. What does "consistency" in ACID actually mean, precisely?

**Answer:** It means a transaction can never commit a state that violates the constraints the database itself was told to enforce — `CHECK` constraints, foreign keys, uniqueness, `NOT NULL`. It isn't an abstract guarantee of "correct business logic" on its own; the database only enforces what you've explicitly declared as a rule, which is why real invariants (like "balance never goes negative") need an actual `CHECK` constraint, not just an assumption in application code.

### 3. What's a "lost update," and how does isolation prevent it?

**Answer:** Two concurrent transactions both read the same starting value before either commits, then each computes and writes a new value based on that same stale read — the second write overwrites the first's change entirely, silently losing it. Proper isolation prevents this by either blocking the second transaction's read/write until the first commits, or by detecting the conflict and forcing a retry, depending on the isolation level and locking strategy in use.

### 4. How does a database actually guarantee durability once a transaction commits?

**Answer:** Typically via a write-ahead log: the change is appended to a durable, sequential log file before the commit is acknowledged to the caller, so even if the actual data files on disk hadn't been fully updated yet when a crash happens, the database can replay the log during recovery and reconstruct the committed change.

### 5. How does `@Transactional` in Spring relate to the database's own `BEGIN`/`COMMIT`/`ROLLBACK`?

**Answer:** It's the application-level trigger for that exact database mechanism — Spring opens a transaction via a proxy when the annotated method is entered, and commits it if the method returns normally or rolls it back if an unchecked exception propagates out, without you writing the SQL transaction commands by hand.

## Revision Checklist

- [ ] Explain all four ACID letters using the money-transfer example, not just their one-word definitions.
- [ ] Reproduce a "lost update" scenario and explain how isolation prevents it.
- [ ] Explain the role of a `CHECK` constraint in enforcing consistency, and give a real example.
- [ ] Explain how a write-ahead log provides durability.
- [ ] Connect `@Transactional`'s rollback behavior directly to atomicity.
