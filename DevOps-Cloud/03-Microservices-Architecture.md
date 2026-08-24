# Microservices Architecture (Beginner-Friendly)

This file follows the same approach as [Spring Boot Fundamentals](../Backend/Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name.

This stays at the architecture/design level — when to split into services, how to draw boundaries, how services talk, how they stay consistent, and how they deploy. For the Spring-specific implementation (WebClient/Feign, Eureka, Resilience4j, Kafka/RabbitMQ listeners), see [08-AOP-Actuator-Microservices.md](../Backend/Springboot/08-AOP-Actuator-Microservices.md) — this file won't repeat that code.

Running example: **ShopEasy**, an e-commerce company.

---

## 1. Monolith vs Microservices

**Scenario:** ShopEasy runs one Java application — users, catalog, cart, checkout, payment, shipping, notifications, all in one codebase, one deployable artifact, one database. This is a **monolith**. It's simple to build, deploy, and test (no network calls, one transaction covers everything) — until two things happen. First: a bug in the shipping module's cost calculation crashes or hangs the process, and because shipping runs in the exact same process and thread pool as checkout, checkout goes down too — one team's bug becomes a company-wide outage. Second: a one-line fix to an email template needs the entire app rebuilt, re-tested, and redeployed, because there's only one deployable unit — every team's release is now hostage to every other team's code being ready.

**Microservices** is the fix: split by business capability into independently deployable services, each with its own process, database, and deploy pipeline.

| | Monolith | Microservices |
|---|---|---|
| Deploy | One artifact, coordinated release | Each service deploys on its own |
| Scaling | Scale everything together (wasteful) | Scale only the hot service |
| Failure | One crash can take down everything | Failure is isolated to one service (if callers handle it — see Section 8) |
| Tech stack | One language/runtime for all | Each service can pick its own |
| Cost | — | Network calls can fail, cross-service consistency gets hard, more to monitor |

This is also why "start monolith, split when a real pain point shows up" is the usual advice, not "always build microservices" (Section 9).

## 2. Service Boundaries

Splitting by *technical layer* ("database service," "API service") doesn't work — those layers still need to call each other for almost everything, so you've just added network calls without removing coupling. The boundary that works is **Domain-Driven Design (DDD)**: split by business capability, so each service owns both the logic and the data for one part of the business.

For ShopEasy: User Service (accounts, auth), Product/Catalog Service (listings, inventory), Cart Service (often Redis-backed), Order Service (orders, status), Payment Service (charges, refunds), Shipping Service (cost, labels), Notification Service (email/SMS). **Rule: each service owns its own data — nobody else queries it directly.** Order Service doesn't read the `users` table; it calls User Service's API.

## 3. Service Communication: Sync vs Async

**Scenario:** Order Service needs the buyer's name/email from User Service to build an order confirmation. In a monolith this was a method call — now it's a network call. The question that decides how: does the caller need the answer *right now* to continue?

**Synchronous (REST or gRPC — gRPC Remote Procedure Call)**: the caller waits for a response. Simple, immediate, strongly consistent at that moment — but the caller is now coupled to the callee being up and fast; if User Service is slow, Order Service's request is stuck too (Section 8 covers containing this). Use it when you can't proceed without the answer.

**Asynchronous (message broker — Kafka, RabbitMQ, AWS SQS, Google Pub/Sub)**: Order Service publishes an `OrderCreated` event and moves on; Notification Service consumes it whenever it's ready. Loosely coupled and resilient (the broker holds the message if a consumer is briefly down), but not immediate — the two services are only "eventually consistent," and a consumer can see the same message twice, so it must be idempotent.

**Rule of thumb:** if the user is waiting on that data to render the next screen, use a synchronous call. If it's a side effect nobody's watching a spinner for, use a broker.

## 4. Choreography vs Orchestration

**Scenario:** placing an order means reserving inventory, charging payment, creating a shipping label, and sending a confirmation — who coordinates that sequence?

**Choreography** — no one's in charge; each service reacts to events from the others (Order publishes `OrderCreated` → Payment reacts and publishes `PaymentProcessed` → Shipping reacts, and so on). Loosely coupled, but past a few steps there's no single place to read the overall flow.

**Orchestration** — one coordinator explicitly calls each step in order and handles failures. Easy to follow, but the coordinator is now coupled to every service in the flow, and it's a single point of failure for the flow itself.

Most real systems use both: orchestration for coordinated, transaction-like flows (Section 5's Saga), choreography for independent side effects like notifications.

## 5. Database per Service and Data Consistency

**Scenario:** letting every service keep reading/writing the old shared database seems convenient — until Payment's schema change silently breaks Order Service, or a heavy analytics query locks a table checkout depends on. A shared database recreates exactly the coupling microservices were meant to remove. So: **each service gets its own database**, and if Order Service needs user data, it calls User Service's API instead of joining across databases directly. The cost: you lose cross-service SQL joins, and two databases can briefly disagree.

That last part is the harder problem: Order Service creates an order (`PENDING`), Payment Service crashes right after charging the card but before confirming — now the customer's charged but the order is stuck `PENDING` forever. A single ACID (Atomicity, Consistency, Isolation, Durability) transaction can't span two databases. **Two-Phase Commit (2PC)** could in theory, but it holds locks across every participant while waiting on the slowest one, and most modern brokers/databases don't support it — avoid it.

The pattern actually used is the **Saga**: a sequence of local transactions coordinated by orchestration or choreography, where each step publishes an event the next step reacts to (`OrderCreated` → Payment charges → `PaymentSucceeded` → Order Service marks it `PAID`). If a later step fails after an earlier one already had a real effect, run a **compensating transaction** — an explicit undo, like a refund, since you can't roll back a remote call. Every step must be idempotent (safe to retry), and the system accepts **eventual consistency** — the order sits `PENDING` for a short window by design. (**Event sourcing** — storing the sequence of events instead of just current state — is a related, heavier-weight alternative worth knowing by name.)

## 6. Deployment: Containers and Kubernetes

**Scenario:** deploying, scaling, and restarting thirty services by hand doesn't scale — a manual step gets skipped, a crashed instance goes unnoticed.

A **container** (Docker) packages a service with everything it needs to run, so it behaves the same everywhere. Built images are pushed to a **container registry** (Docker Hub, AWS ECR, etc.) and pulled from there when deployed. **Kubernetes** then handles running them: you declare the desired state, and it keeps reality matching it.

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3                # Kubernetes keeps exactly 3 pods running
  template:
    spec:
      containers:
      - name: order-service
        image: registry.example.com/order-service:1.0
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

This gives **self-healing** (a crashed pod is replaced automatically), **auto-scaling** (the `HorizontalPodAutoscaler` adds/removes pods based on load — directly solving the monolith's "scale everything or nothing" problem), **rolling updates** (zero-downtime deploys), and built-in **service discovery** via internal DNS.

## 7. Distributed Systems Challenges

Splitting into services moves complexity from "one complex codebase" into a set of cross-cutting problems:

- **Service discovery** — instances scale up/down and get new addresses constantly, so hardcoding an address breaks fast. A registry (Kubernetes DNS, Eureka, Consul) lets services be looked up by name instead.
- **Load balancing** — with multiple instances of a service, something needs to spread requests across them (Kubernetes does this internally; an external load balancer or the API Gateway does it at the edge).
- **Circuit breaker** — if Shipping Service goes slow, every caller waiting on it can tie up threads and go down too. A circuit breaker tracks failures and, past a threshold, fails fast instead of waiting, protecting the caller.
- **Distributed tracing** (Jaeger, Zipkin) — a request spanning four services needs a shared trace ID to find which one is actually slow.
- **Centralized logging** (ELK, CloudWatch) — logs scattered across services need to land in one searchable place.
- **Testing** — you can't spin up thirty services to test one change; use unit tests (mocked dependencies), contract tests (verify the API agreement), and integration/end-to-end tests sparingly.

## 8. API Gateway

**Scenario:** without one, a client needs every service's address, and every service has to implement its own auth checks and rate limiting.

An **API Gateway** is the single entry point clients call. It routes requests to the right service (`/orders/*` → Order Service) and handles cross-cutting concerns once, centrally — auth validation, rate limiting, logging — instead of duplicating them in every service.

## 9. When to Actually Use Microservices

Use them when parts of the system need to scale differently, need different tech, need independent deploy schedules, or are owned by separate teams that need clear boundaries. Stay with a monolith when the team is small (the overhead in Section 7 costs more than it saves), there's no real scaling need, or the system is too interconnected to cleanly separate. Common advice: **start monolith, split out a service once a specific pain point — not a hypothetical one — shows up.**

## Interview Questions and Answers

### 1. When should you use microservices?

**Answer:** When different parts of the system need to scale independently, use different tech stacks, deploy on independent schedules, or are owned by separate teams needing clear boundaries. Avoid it for small teams, systems with no real scaling need, or tightly interconnected logic — the operational overhead (service discovery, tracing, more moving parts) isn't worth it without a real pain point to justify it. Rule of thumb: start monolith, split when needed.

### 2. Design the microservices for an e-commerce system like ShopEasy.

**Answer:** User, Product/Catalog, Cart (often Redis), Order, Payment, Shipping, and Notification services, each owning its own database. Synchronous REST for anything needing an immediate answer (checking product availability); async events over Kafka/RabbitMQ for side effects (order confirmation emails). Order creation runs as a Saga across Order → Payment → Shipping with compensating transactions (refunds) on failure, accepting eventual consistency. An API Gateway fronts everything; Docker + Kubernetes handle deployment and independent scaling (Product Service scaled higher than Notification during a sale); distributed tracing and centralized logging make the whole thing debuggable.

### 3. How do you handle data consistency across services?

**Answer:** With the Saga pattern — a sequence of local transactions coordinated via events, where each step is idempotent and a failed later step triggers a compensating transaction (e.g., a refund) on an earlier one, since there's no cross-service rollback. The system accepts eventual consistency rather than using a distributed transaction (2PC), which doesn't scale and isn't broadly supported.

### 4. What is an API Gateway, and why does a microservices system need one?

**Answer:** The single entry point clients talk to — it routes requests to the correct backend service and handles auth, rate limiting, and logging once, centrally, instead of every service reimplementing them. Without one, clients need to know every service's address individually.

### 5. What is service discovery?

**Answer:** A registry that every service instance registers with on startup (and sends heartbeats to), so other services can look it up by name instead of a hardcoded address that stops being valid the moment instances scale up or down. Kubernetes DNS, Eureka, and Consul are common implementations.

### 6. Why can't microservices just share one database?

**Answer:** It recreates the coupling microservices are meant to remove — a schema change from one team can break another's service, one team's heavy query can degrade performance for everyone, and no service can pick a database technology suited to its own workload. Each service should own its own database and expose an API for others to get its data.

### 7. REST vs a message queue for calling another service — how do you choose?

**Answer:** Use REST (synchronous) when you need the answer immediately to continue (checking if a user exists before creating an order) — the trade-off is that a slow or down callee makes your request stuck too. Use a message queue (Kafka/RabbitMQ/SQS) when the caller doesn't need to wait (sending a confirmation email) — the trade-off is the two services become only eventually consistent. If the user is waiting on that data, use REST; if it's a side effect, use a queue.

### 8. What does Kubernetes actually solve that manual deployment doesn't?

**Answer:** You declare a desired state (3 replicas) and it keeps enforcing it: restarting crashed pods automatically (self-healing), scaling replicas up/down based on load via a `HorizontalPodAutoscaler` (solving the monolith's "scale everything together" problem), rolling out updates with zero downtime, and giving every service discoverability via internal DNS.

### 9. Why split services by business capability instead of by technical layer?

**Answer:** A split by layer ("database service," "API service") still needs constant cross-calls for almost everything, so it adds network overhead without removing coupling. Splitting by business capability (Domain-Driven Design) means each service owns both the logic and the data for one part of the business, giving it a real, independent boundary.

## Revision Checklist

- [ ] Explain, using the shipping-bug and whole-company-deploy scenarios, what actually breaks in a monolith and how microservices fix it.
- [ ] Explain why service boundaries follow business capability (DDD), not technical layer.
- [ ] Decide sync vs async communication for a given interaction, and justify it.
- [ ] Compare choreography and orchestration.
- [ ] Explain why each service needs its own database, and walk through the Saga pattern with a compensating transaction.
- [ ] Read a Kubernetes `Deployment`/`HorizontalPodAutoscaler` and explain self-healing, auto-scaling, and rolling updates.
- [ ] Name the main distributed-systems challenges (discovery, load balancing, circuit breakers, tracing, logging, testing) and what each solves.
- [ ] Explain what an API Gateway centralizes.
- [ ] Give a clear answer for when to use microservices vs stay with a monolith.
- [ ] Design a full microservices architecture for an e-commerce system end to end.
