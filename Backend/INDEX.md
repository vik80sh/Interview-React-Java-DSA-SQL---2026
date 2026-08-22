# Backend Interview Roadmap

Backend prep is organized into three folders here, mirroring how the layers actually relate: the language underneath, the framework on top of it, and the database underneath everything both of them eventually talk to. Spring Boot's own mechanics — beans, proxies, AOP, transactions — only make sense once the core Java behind them (the JVM, generics, concurrency primitives, design patterns) is solid, and JPA/Hibernate only make sense once the raw SQL and transaction guarantees underneath them are solid too.

## Folders

1. **[Java/](Java/INDEX.md)** — JVM and memory, variables/casting, OOP fundamentals, constructors/equals/hashCode, strings, collections, exceptions, multithreading, Java 8 (lambdas/streams/Optional), generics/enums/modern Java, design patterns, SOLID principles, and serialization/cloning/reflection/annotations.
2. **[Springboot/](Springboot/INDEX.md)** — Spring Boot fundamentals (IoC/DI, bean lifecycle, auto-configuration), REST API design, database/JPA/Hibernate, authentication and security, testing, concurrency in a Spring context, common reliability patterns, and AOP/Actuator/microservice communication.
3. **[Database/](Database/INDEX.md)** — choosing the right database, SQL query fundamentals, joins explained precisely, ACID and isolation levels, indexing/query optimization, normalization and schema design, and MongoDB/Redis in practice.

## How to Study

1. Read one guide.
2. Close it and explain the mechanism aloud, using its real-world example (an `Order`, a `PaymentMethod`, a checkout flow), not the abstract definition.
3. Build or modify the code example yourself and predict what happens before running it.
4. Answer that guide's Interview Questions and Answers, including the follow-up reasoning, not just the one-line answer.
5. Note anything you couldn't explain cleanly, and revisit that specific section before moving on.

## Interview Answer Template

For a backend design or "explain this mechanism" question, structure the answer:

1. **Clarify the requirement** — consistency, latency, scale, and failure expectations.
2. **State the invariant** — what must never be wrong or duplicated.
3. **Give the simple design** — endpoint, service boundary, database, response.
4. **Explain concurrency** — retries, duplicate requests, locks, versions, transactions.
5. **Explain operations** — timeouts, metrics, logs, tracing, alerts.
6. **Name the trade-off** — what the design makes harder or more expensive, and why that's the right call here.

## Final Cross-Folder Readiness Checklist

- [ ] Explain the JVM memory model and Spring's own object lifecycle (bean creation, proxies) as two related but distinct layers.
- [ ] Connect a core-Java mechanism to the Spring concept it underpins — proxies and AOP/`@Transactional`, `Repository<T, ID>` and Spring Data, immutable records and DTOs, SOLID's Dependency Inversion and constructor injection.
- [ ] Design a versioned REST API with DTOs, validation, errors, pagination, and idempotency.
- [ ] Explain entity lifecycle, persistence context, N+1, transactions, indexes, and locking end to end.
- [ ] Trace SQL joins by hand, explain ACID/isolation with real failure modes, and read an `EXPLAIN` plan to justify an index.
- [ ] Secure passwords, tokens, sessions, CSRF, CORS, and object-level authorization correctly.
- [ ] Choose the right test slice and design tests around behavior and failure paths, not implementation details.
- [ ] Explain race conditions, deadlocks, and async failure handling at both the core-Java and Spring-async layers.
- [ ] Design cache, retry, circuit-breaker, outbox, and transfer workflows with their real trade-offs named explicitly.
- [ ] Defend every technology choice by its trade-off, not by reciting it as a default.
