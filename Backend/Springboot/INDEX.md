# Backend Interview Roadmap

This folder is a learning path, not a collection of claims about interview percentages. Use each guide actively: explain the idea aloud, write the small example, break it deliberately, and answer the follow-ups.

## Recommended Order

1. [Spring Boot Fundamentals](01-Spring-Boot-Fundamentals.md)
2. [REST API Design](02-REST-API-Design.md)
3. [Database, JPA, and Hibernate](03-Database-JPA-Hibernate.md)
4. [Authentication and Security](04-Authentication-Security.md)
5. [Testing Java Backend Applications](05-Testing-Java.md)
6. [Concurrency and Asynchronous Processing](06-Concurrency-Async.md)
7. [Common Backend Problems and Reliable Patterns](07-Common-Backend-Problems.md)
8. [AOP, Actuator, and Microservice Communication](08-AOP-Actuator-Microservices.md)

## What Mastery Looks Like

### Explain

- You can describe the mechanism in plain language and draw its execution flow.
- You can answer a definition question in 30 seconds and continue with a trade-off.
- You can explain one failure mode and how you would observe it.

### Implement

- You can build a layered CRUD endpoint with DTOs, validation, persistence, errors, and tests.
- You can add authentication and enforce both role and object-level authorization.
- You can implement pagination, idempotency, caching, and optimistic locking safely.

### Diagnose

- You can use logs, metrics, SQL output, query plans, and test failures to locate the controlling layer.
- You can explain what happens during a retry, timeout, duplicate request, concurrent update, and partial outage.

## Four-Week Practice Plan

### Week 1: Application Foundations

Read Spring and REST. Build a small user API with constructor injection, DTOs, validation, `@RestControllerAdvice`, pagination, and an OpenAPI description.

### Week 2: Data and Security

Add a real database, migrations, relationships, indexes, a service-level transaction, and an optimistic version field. Add password hashing, login, authorization, and tests for forbidden access.

### Week 3: Confidence and Scale

Write unit, MVC-slice, JPA-slice, and integration tests. Reproduce N+1 with SQL logging. Add an async report operation with a bounded executor, timeout, and failure test.

### Week 4: Production Scenarios

Practice cache consistency, idempotent payments, retries, circuit breakers, outbox delivery, dead-letter handling, and a multi-instance scheduled job. Draw the failure paths before coding. Then read AOP, Actuator, and microservice communication: explain why `@Transactional` breaks on self-invocation, wire a custom health check, and configure a Resilience4j circuit breaker with a real fallback.

## Interview Answer Template

When asked a backend design question, structure the answer like this:

1. **Clarify the requirement:** users, consistency, latency, scale, and failure expectations.
2. **State the invariant:** what must never be wrong or duplicated?
3. **Give the simple design:** endpoint, service boundary, database, and response.
4. **Explain concurrency:** retries, duplicate requests, locks, versions, and transactions.
5. **Explain operations:** timeouts, metrics, logs, tracing, and alerts.
6. **Name the trade-off:** what does the design make harder or more expensive?

## Cross-Cutting Topics To Add to Your Study

These eight guides cover the application layer, including Spring's own AOP/Actuator internals and how a service talks to another service (guide 8). Continue with SQL joins and query plans, database indexes and connection pools, logging/metrics/tracing, messaging internals (Kafka/RabbitMQ), Docker and deployment, load balancing, and system design. Do not describe these areas as zero-value gaps; treat them as the next layer of practice.

## Final Readiness Checklist

- [ ] Explain the Spring startup and HTTP request flows.
- [ ] Design a versioned REST API with DTOs, validation, errors, pagination, and idempotency.
- [ ] Explain entity lifecycle, persistence context, N+1, transactions, indexes, and locking.
- [ ] Secure passwords, tokens, sessions, CSRF, CORS, and object-level authorization.
- [ ] Choose the right test slice and test failure paths.
- [ ] Explain race conditions, happens-before, executors, async failures, and backpressure.
- [ ] Design cache, retry, circuit-breaker, outbox, and transfer workflows.
- [ ] Explain AOP proxies behind `@Transactional`/`@Async`, wire an Actuator health check, and pick between RestTemplate/WebClient/Feign with resilience configured.
- [ ] Defend trade-offs instead of reciting one preferred technology.

## How To Study Each File

1. Read one section.
2. Close the guide and explain it aloud.
3. Implement or modify the example.
4. Predict a failure before running it.
5. Answer the section's interview questions, including the follow-up.
6. Record what you could not explain and revisit that specific section.

## Index Interview Questions and Answers

### 1. How should you prepare a backend topic for an interview?

**Answer:** Understand the mechanism, implement a small example, identify a failure mode, explain how to observe it, and defend the trade-offs. A memorized definition is only the opening sentence of a strong answer.

### 2. What should a backend design answer cover?

**Answer:** Requirements, invariants, API and data model, transaction and concurrency behavior, failure handling, security, observability, and the main trade-off. The exact technology is less important than explaining why it fits.

### 3. How do these guides connect?

**Answer:** Spring owns application wiring, REST defines the HTTP contract, JPA persists data, Security protects identity and actions, Testing verifies behavior, Concurrency handles overlapping work, guide 7 addresses reliability under scale and failure, and guide 8 covers how Spring implements its own cross-cutting features (AOP) and how one service observes itself (Actuator) and talks to another service (WebClient/Feign, discovery, Resilience4j).

### 4. What proves that you understand a topic?

**Answer:** You can explain it without notes, write or modify the example, predict what happens under an edge case, diagnose a failure using evidence, and answer why an alternative was not chosen.
