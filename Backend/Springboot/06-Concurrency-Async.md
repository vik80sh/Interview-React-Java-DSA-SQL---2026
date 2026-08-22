# Concurrency and Asynchronous Processing

Concurrency means multiple tasks overlap in execution. Parallelism means tasks execute at the same time on different cores. The hard part is shared mutable state, coordination, resource limits, and failure handling.

## 1. Race Conditions and the Memory Model

```java
class Counter {
    private int value;
    void increment() { value++; }
}
```

`value++` is read, add, write; two threads can interleave and lose an update. `volatile` provides visibility and ordering for a variable, but it does not make a compound read-modify-write atomic. Use immutable state, confinement, a lock, or an atomic type:

```java
private final AtomicInteger value = new AtomicInteger();
value.incrementAndGet();
```

The Java Memory Model explains when one thread's writes become visible to another. A happens-before relationship is established by mechanisms such as unlocking then locking the same monitor, completing a future then observing it, or writing a volatile variable then reading it.

## 2. Locks and Deadlocks

Use `synchronized` for simple mutual exclusion. Use `ReentrantLock` when you need timed acquisition, interruptible waits, or fairness. Always unlock in `finally`.

To transfer between two accounts, lock accounts in a deterministic order, such as ascending account ID. Locking `from` then `to` is unsafe because another transfer can lock them in the opposite order:

```java
Account first = a.id() < b.id() ? a : b;
Account second = first == a ? b : a;
first.lock().lock();
try {
    second.lock().lock();
    try { transferBalances(a, b, amount); }
    finally { second.lock().unlock(); }
} finally { first.lock().unlock(); }
```

Other deadlock prevention tools include lock timeouts, avoiding nested locks, and reducing lock scope. Database locks and distributed locks have different failure modes; an in-process lock cannot protect data across application instances.

## 3. Executors and CompletableFuture

Do not create an unbounded thread per request. Use a bounded executor with named threads, a queue policy, rejection handling, and graceful shutdown. CPU-bound work is limited by cores; blocking I/O consumes threads while waiting and must also respect downstream connection limits.

`CompletableFuture` composes asynchronous results, but `join()` and blocking calls inside an executor can still consume threads:

```java
CompletableFuture<User> user = userClient.fetchUser(id);
CompletableFuture<List<Order>> orders = orderClient.fetchOrders(id);

CompletableFuture<Dashboard> dashboard = user.thenCombine(orders,
    (u, os) -> new Dashboard(u, os))
    .orTimeout(2, TimeUnit.SECONDS)
    .exceptionally(ex -> Dashboard.unavailable());
```

Use `thenApply` for a synchronous transformation and `thenCompose` when the transformation returns another future. `allOf` waits for completion but discards typed results, so collect the original futures afterward. Propagate cancellation and preserve the cause of failures.

## 4. Spring `@Async`

`@Async` submits work through a Spring proxy to a task executor. It is not automatically non-blocking: it moves blocking work to another pool. That pool can still exhaust threads, database connections, or downstream capacity. Configure a named bounded executor and handle exceptions for `void` methods.

Self-invocation bypasses the proxy, so `this.generate()` does not activate `@Async`. Put the method in another bean or call through the proxy. Never assume request context, security context, transactions, or MDC automatically transfer to another thread; propagate what the task needs explicitly.

## 5. Reactive and Scheduling Choices

Reactive programming can provide non-blocking I/O and backpressure when the entire stack is reactive. Wrapping blocking JDBC or `Thread.sleep` in `Mono` does not make it non-blocking; isolate blocking work on a suitable scheduler or use a reactive driver.

`@Scheduled` runs on each application instance by default. A daily job can therefore run three times in a three-instance deployment. Use a distributed scheduler, a database lock library, or an idempotent job design when only one execution is allowed. `fixedRate` measures from scheduled start times; `fixedDelay` waits after completion.

## 6. Virtual Threads and Backpressure

Virtual threads reduce the cost of blocking thread-per-task code, but they do not make CPU infinite or remove database and remote-service limits. Use semaphores, bounded queues, client timeouts, rate limits, and bulkheads to protect scarce resources. Every async boundary needs a timeout and an overload policy.

## Interview Questions and Answers

### 1. Why is `volatile` insufficient for `count++`?

**Answer:** Volatile makes reads and writes visible but does not combine the read, increment, and write into one atomic operation. Use `AtomicInteger`, a lock, or eliminate shared mutation.

### 2. How do you prevent deadlock?

**Answer:** Acquire multiple locks in a global deterministic order, use timed or interruptible lock acquisition, avoid unnecessary nested locks, and keep critical sections small.

### 3. What does `@Async` actually do?

**Answer:** A Spring proxy submits the method to a configured executor. The caller can receive a future immediately, but the work is still bounded by executor and downstream resources. Self-invocation bypasses the proxy.

### 4. `thenApply` versus `thenCompose`?

**Answer:** `thenApply` maps a value to another value. `thenCompose` flattens a function that returns a `CompletableFuture`, preventing nested futures.

### 5. How should a thread pool be sized?

**Answer:** Start with workload measurements. CPU-bound work is near available cores; blocking work may use more threads, but database connections, queue length, latency, memory, and downstream limits cap useful concurrency. Formulas are starting heuristics, not guarantees.

### 6. How do you handle async failures?

**Answer:** Return a future and compose error handling, set timeouts, preserve causes, propagate cancellation, and define a fallback only when it is semantically safe. Log failures with task context.

### 7. Is reactive code always faster?

**Answer:** No. It can improve resource use for high-concurrency non-blocking I/O, but adds complexity and does not help CPU saturation or blocking calls. Measure the workload.

### 8. Why can scheduled jobs duplicate?

**Answer:** Each application instance runs its own scheduler. In a cluster, use distributed coordination or make the job idempotent so duplicate execution is harmless.

### 9. What is backpressure?

**Answer:** It is a way for a consumer to communicate capacity limits so producers do not overwhelm it. Queues, bounded executors, rate limits, and reactive demand are different forms of overload control.

### 10. What does happens-before mean?

**Answer:** It is a visibility and ordering guarantee: if action A happens-before action B, B must observe A's effects according to the memory model. Synchronization, volatile access, thread start, and future completion can establish it.

## Revision Checklist

- [ ] Explain race conditions, atomicity, visibility, and happens-before.
- [ ] Fix a deadlock by deterministic lock ordering.
- [ ] Compose futures with transformations, timeouts, and error handling.
- [ ] Configure `@Async` with a bounded executor and understand proxy limits.
- [ ] Explain scheduling in a multi-instance deployment.
- [ ] Choose between synchronous, async, reactive, and virtual-thread approaches using resource limits.
